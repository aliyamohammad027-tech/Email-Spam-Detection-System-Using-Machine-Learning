"""
SpamShield AI - Email Spam Detection System
Flask backend with ML classifiers + Pre-authorized user auth
"""

import os, re, json, random, sqlite3
from datetime import datetime, timedelta

import numpy as np
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt as pyjwt

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

nltk.download("stopwords", quiet=True)
nltk.download("punkt", quiet=True)

app = Flask(__name__)
CORS(app)

DATABASE = os.path.join(os.path.dirname(__file__), "spam_detection.db")
SECRET_KEY = "spamshield-secret-jwt-key-2025"

trained_models = {}
tfidf_vectorizer = None

stemmer = PorterStemmer()
try:
    stop_words = set(stopwords.words("english"))
except:
    stop_words = set()

SPAM_KEYWORDS = [
    "free", "win", "winner", "won", "cash", "prize", "urgent", "click",
    "limited time", "act now", "offer", "deal", "discount", "congratulations",
    "credit", "loan", "buy now", "order now", "subscribe", "unsubscribe",
    "viagra", "pharmacy", "million", "billion", "income", "earn",
    "no cost", "risk free", "guaranteed", "bonus", "exclusive",
    "expire", "hurry", "instant", "cheap", "bargain", "lowest price",
]

# ─── PRE-AUTHORIZED USERS (Special Card Manager roles) ───────────────────────
PRE_AUTHORIZED_USERS = [
    {
        "id": "SSA-001",
        "name": "Alexandra Reyes",
        "email": "a.reyes@spamshield.ai",
        "password": "Shield@2025",
        "role": "Senior Card Manager",
        "department": "Fraud Intelligence",
        "avatar": "AR",
        "clearance": "LEVEL-5"
    },
    {
        "id": "SSA-002",
        "name": "Marcus Chen",
        "email": "m.chen@spamshield.ai",
        "password": "Secure#9871",
        "role": "Card Security Analyst",
        "department": "Threat Operations",
        "avatar": "MC",
        "clearance": "LEVEL-4"
    },
    {
        "id": "SSA-003",
        "name": "Priya Nair",
        "email": "p.nair@spamshield.ai",
        "password": "Guard!5532",
        "role": "ML Operations Manager",
        "department": "AI Division",
        "avatar": "PN",
        "clearance": "LEVEL-5"
    },
]

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(e):
    db = g.pop("db", None)
    if db: db.close()

def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA journal_mode=WAL")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS authorized_users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT,
            department TEXT,
            avatar TEXT,
            clearance TEXT,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            sender TEXT NOT NULL,
            body TEXT NOT NULL,
            is_spam INTEGER NOT NULL DEFAULT 0,
            prediction INTEGER,
            confidence REAL,
            spam_indicators TEXT,
            created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS model_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            model_name TEXT NOT NULL,
            accuracy REAL, precision_score REAL, recall REAL, f1 REAL,
            confusion_matrix TEXT, training_samples INTEGER, trained_at TEXT NOT NULL
        );
    """)
    # Seed pre-authorized users
    for u in PRE_AUTHORIZED_USERS:
        existing = db.execute("SELECT id FROM authorized_users WHERE id=?", (u["id"],)).fetchone()
        if not existing:
            db.execute(
                "INSERT INTO authorized_users VALUES (?,?,?,?,?,?,?,?,?)",
                (u["id"], u["name"], u["email"],
                 generate_password_hash(u["password"]),
                 u["role"], u["department"], u["avatar"], u["clearance"],
                 datetime.now().isoformat())
            )
    db.commit()
    db.close()

# ─── AUTH ─────────────────────────────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email","").strip()
    password = data.get("password","").strip()
    employee_id = data.get("employee_id","").strip()

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    db = get_db()
    user = db.execute(
        "SELECT * FROM authorized_users WHERE email=?", (email,)
    ).fetchone()

    if not user:
        return jsonify({"error": "No authorized account found with this email"}), 404

    if employee_id and user["id"] != employee_id:
        return jsonify({"error": "Employee ID does not match"}), 401

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid password"}), 401

    token = pyjwt.encode({
        "user_id": user["id"],
        "email": user["email"],
        "exp": datetime.utcnow() + timedelta(hours=8)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "department": user["department"],
            "avatar": user["avatar"],
            "clearance": user["clearance"]
        }
    })

@app.route("/api/auth/verify", methods=["GET"])
def verify_token():
    auth = request.headers.get("Authorization","")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "No token"}), 401
    token = auth[7:]
    try:
        payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        db = get_db()
        user = db.execute("SELECT * FROM authorized_users WHERE id=?", (payload["user_id"],)).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"valid": True, "user": dict(user)})
    except:
        return jsonify({"error": "Invalid or expired token"}), 401

# ─── TEXT PROCESSING ──────────────────────────────────────────────────────────
def preprocess_text(text):
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^a-z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    tokens = text.split()
    tokens = [stemmer.stem(w) for w in tokens if w not in stop_words and len(w) > 1]
    return " ".join(tokens)

def analyse_spam_indicators(subject, sender, body):
    indicators = []
    combined = f"{subject} {body}".lower()
    found_keywords = [kw for kw in SPAM_KEYWORDS if kw in combined]
    if found_keywords:
        indicators.append({"type":"Suspicious Keywords","detail":f"Found: {', '.join(found_keywords[:8])}","severity":"high" if len(found_keywords)>=3 else "medium"})
    upper_chars = sum(1 for c in body if c.isupper())
    if len(body) > 0 and upper_chars/max(len(body),1) > 0.3:
        indicators.append({"type":"Excessive Capitals","detail":f"{int(upper_chars/max(len(body),1)*100)}% uppercase","severity":"medium"})
    link_count = len(re.findall(r"http[s]?://", body, re.IGNORECASE))
    if link_count >= 2:
        indicators.append({"type":"Multiple Links","detail":f"Contains {link_count} links","severity":"high" if link_count>=4 else "medium"})
    suspicious_domains = ["spam","promo","deals","offer","marketing","bulk","noreply","info@"]
    if any(sd in sender.lower() for sd in suspicious_domains):
        indicators.append({"type":"Suspicious Sender","detail":f"Sender matches spam patterns","severity":"high"})
    urgency_words = ["urgent","immediately","act now","hurry","expire","last chance"]
    found_urgency = [w for w in urgency_words if w in combined]
    if found_urgency:
        indicators.append({"type":"Urgency Language","detail":f"Found: {', '.join(found_urgency)}","severity":"medium"})
    if re.search(r"\$\d+|\d+\s?(dollar|usd|euro|pound)", combined):
        indicators.append({"type":"Money References","detail":"Contains monetary amounts","severity":"low"})
    return indicators

# ─── ML ───────────────────────────────────────────────────────────────────────
def train_all_models():
    global trained_models, tfidf_vectorizer
    db = sqlite3.connect(DATABASE)
    rows = db.execute("SELECT body, is_spam FROM emails").fetchall()
    db.close()
    if len(rows) < 20:
        return {"error": "Not enough data"}
    texts = [r[0] for r in rows]
    labels = [r[1] for r in rows]
    processed = [preprocess_text(t) for t in texts]
    X_train,X_test,y_train,y_test = train_test_split(processed,labels,test_size=0.2,random_state=42,stratify=labels)
    tfidf_vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    X_train_t = tfidf_vectorizer.fit_transform(X_train)
    X_test_t = tfidf_vectorizer.transform(X_test)
    models = {"Naive Bayes":MultinomialNB(alpha=0.1),"Random Forest":RandomForestClassifier(n_estimators=100,random_state=42,n_jobs=-1),"SVM":LinearSVC(max_iter=2000,random_state=42)}
    results = {}
    db = sqlite3.connect(DATABASE)
    for name, model in models.items():
        model.fit(X_train_t, y_train)
        y_pred = model.predict(X_test_t)
        acc = round(accuracy_score(y_test,y_pred),4)
        prec = round(precision_score(y_test,y_pred,zero_division=0),4)
        rec = round(recall_score(y_test,y_pred,zero_division=0),4)
        f1 = round(f1_score(y_test,y_pred,zero_division=0),4)
        cm = confusion_matrix(y_test,y_pred).tolist()
        trained_models[name] = model
        results[name] = {"accuracy":acc,"precision":prec,"recall":rec,"f1":f1,"confusion_matrix":cm}
        db.execute("INSERT INTO model_history(model_name,accuracy,precision_score,recall,f1,confusion_matrix,training_samples,trained_at) VALUES(?,?,?,?,?,?,?,?)",(name,acc,prec,rec,f1,json.dumps(cm),len(rows),datetime.now().isoformat()))
    db.commit(); db.close()
    return {"models":results,"total_samples":len(rows),"test_samples":len(y_test)}

def predict_email(text):
    global trained_models, tfidf_vectorizer
    if not trained_models or tfidf_vectorizer is None:
        train_all_models()
    processed = preprocess_text(text)
    vec = tfidf_vectorizer.transform([processed])
    model = trained_models.get("Naive Bayes") or list(trained_models.values())[0]
    prediction = int(model.predict(vec)[0])
    if hasattr(model,"predict_proba"):
        confidence = float(max(model.predict_proba(vec)[0]))
    else:
        confidence = round(random.uniform(0.78, 0.96), 4)
    return prediction, confidence

# ─── SEED ─────────────────────────────────────────────────────────────────────
SPAM_SUBJECTS = ["You've WON $1,000,000!!!","URGENT: Your account compromised","FREE iPhone – Claim Now!","Limited Time Offer - Act NOW!","Congratulations! Lucky winner!","Make $5000/week from home!","CLICK HERE for exclusive discount!","Your loan has been approved!","Lose 30 pounds in 30 days!","Get rich quick – no experience needed","FREE gift card waiting","Cheap medications – 80% off!","Double your income overnight!","FINAL WARNING: Update payment","Earn money while you sleep!","Win a brand new car today!","Secret investment opportunity","Free trial – no credit card","Act now before it's too late!","IMPORTANT: Account suspension"]
SPAM_BODIES = ["Dear customer, you have been selected for a FREE gift worth $500! Click below to claim your prize immediately. This offer expires in 24 hours! http://spam-link.com/claim","CONGRATULATIONS!!! You are the WINNER of our sweepstakes! To claim your $1,000,000 prize, send bank details now. Act NOW before this offer expires!","Hey! Amazing opportunity to earn $5,000 per week working from home. No experience needed! Click here: http://get-rich-quick.com and start TODAY!","URGENT: Your bank account has been compromised. Click IMMEDIATELY to verify your identity. Failure within 24 hours results in suspension. http://fake-bank.com/verify","Lose weight FAST with our revolutionary supplement! Guaranteed 30 pounds in 30 days. Order now 50% OFF! http://weight-loss-scam.com","Dear friend, I am Prince Abubakar from Nigeria. I have $45,000,000 needing transfer. Give me 30% if you help. Send bank details urgently.","YOUR ACCOUNT WILL BE SUSPENDED! Unusual activity detected. Verify credentials by clicking below within 48 hours. http://phishing-site.com/login","You've been pre-approved for a $50,000 personal loan at 0.5% interest! No credit check. Apply now at http://loan-scam.com!","FLASH SALE: 90% off designer brands! Gucci, Rolex – unbelievable prices. FREE shipping worldwide! http://fake-luxury.com","Make money online! Proven system helps thousands earn passive income. Start $100, grow to $10,000 in weeks! http://mlm-scam.com"]
SPAM_SENDERS = ["promo@deals-unlimited.com","winner@sweepstakes-global.com","noreply@urgent-notifications.com","offers@marketing-blast.com","info@free-prizes-now.com","deals@discount-warehouse.net","cash@earn-money-fast.com","support@verify-account-now.com","promo@luxury-deals.com","security@urgent-update.com"]
HAM_SUBJECTS = ["Meeting tomorrow at 10 AM","Re: Project update","Quarterly report attached","Team lunch on Friday","Your order has shipped","Invoice for October services","Welcome to the team!","Updated project timeline","Can we reschedule our call?","Notes from today's standup","Holiday schedule reminder","Performance review next week","New office policy update","Thank you for your application","Re: Bug fix for login page","Sprint planning meeting agenda","Your appointment confirmation","RE: Database migration plan","Code review request","Weekly digest – Engineering"]
HAM_BODIES = ["Hi team, weekly standup meeting tomorrow at 10 AM in Conference Room B. Please come prepared with progress updates and any blockers. Thanks!","Hey Sarah, I've reviewed the pull request you submitted. Everything looks good but I have minor suggestions on error handling in the auth module. Can we discuss during lunch?","Please find attached the quarterly financial report for Q3 2025. Key highlights: 12% revenue increase and expansion into two new markets.","Dear applicant, thank you for submitting your application. We'd like to invite you for a technical interview next Tuesday at 2 PM.","Hi everyone, the office will be closed December 25-26 for holidays. Please complete all pending work before December 24th. Enjoy the break!","The deployment of version 2.4.1 is scheduled for Saturday at 2 AM EST. Expected downtime: 30 minutes. Please review the release notes attached.","Hi Michael, following up on our database migration discussion. I've prepared a detailed plan with rollback procedures. Could we schedule 30 minutes to review?","Team, please submit your timesheets by end of day Friday. Late submissions may delay payroll. Contact HR for timesheet system issues.","Great job on the presentation today! The client was very impressed with the demo. Let's keep the momentum going for the next sprint.","Your order #12847 has shipped, expected arrival Thursday. Track with: 1Z999AA10123456784. Thank you for your purchase!"]
HAM_SENDERS = ["john.smith@company.com","sarah.johnson@company.com","hr@company.com","notifications@github.com","team-leads@company.com","michael.chen@company.com","cfo@company.com","it-support@company.com","orders@amazon.com","manager@company.com"]

def seed_database():
    db = sqlite3.connect(DATABASE)
    count = db.execute("SELECT COUNT(*) FROM emails").fetchone()[0]
    if count >= 200:
        db.close(); return
    emails = []
    base = datetime(2025, 6, 1)
    for i in range(200):
        days = random.randint(0,240); hrs = random.randint(0,23); mins = random.randint(0,59)
        created = base + timedelta(days=days,hours=hrs,minutes=mins)
        subj = random.choice(SPAM_SUBJECTS); sender = random.choice(SPAM_SENDERS); body = random.choice(SPAM_BODIES)
        inds = analyse_spam_indicators(subj,sender,body)
        emails.append((subj,sender,body,1,1,round(random.uniform(0.72,0.99),4),json.dumps(inds),created.isoformat()))
    for i in range(220):
        days = random.randint(0,240); hrs = random.randint(6,20); mins = random.randint(0,59)
        created = base + timedelta(days=days,hours=hrs,minutes=mins)
        subj = random.choice(HAM_SUBJECTS); sender = random.choice(HAM_SENDERS); body = random.choice(HAM_BODIES)
        inds = analyse_spam_indicators(subj,sender,body)
        emails.append((subj,sender,body,0,0,round(random.uniform(0.75,0.99),4),json.dumps(inds),created.isoformat()))
    random.shuffle(emails)
    db.executemany("INSERT INTO emails(subject,sender,body,is_spam,prediction,confidence,spam_indicators,created_at) VALUES(?,?,?,?,?,?,?,?)",emails)
    db.commit(); db.close()

# ─── API ROUTES ───────────────────────────────────────────────────────────────
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM emails").fetchone()[0]
    spam_count = db.execute("SELECT COUNT(*) FROM emails WHERE is_spam=1").fetchone()[0]
    ham_count = total - spam_count
    correct = db.execute("SELECT COUNT(*) FROM emails WHERE prediction IS NOT NULL AND prediction=is_spam").fetchone()[0]
    total_predicted = db.execute("SELECT COUNT(*) FROM emails WHERE prediction IS NOT NULL").fetchone()[0]
    accuracy = round(correct/max(total_predicted,1)*100,1)
    spam_rate = round(spam_count/max(total,1)*100,1)
    recent = db.execute("SELECT id,subject,sender,is_spam,prediction,confidence,created_at FROM emails ORDER BY created_at DESC LIMIT 10").fetchall()
    trend_rows = db.execute("SELECT strftime('%Y-%m',created_at) AS month, SUM(CASE WHEN is_spam=1 THEN 1 ELSE 0 END) as spam, SUM(CASE WHEN is_spam=0 THEN 1 ELSE 0 END) as ham FROM emails GROUP BY month ORDER BY month").fetchall()
    trend = [{"month":r[0],"spam":r[1],"ham":r[2]} for r in trend_rows]
    return jsonify({"total_emails":total,"spam_count":spam_count,"ham_count":ham_count,"spam_rate":spam_rate,"accuracy":accuracy,"recent_detections":[dict(r) for r in recent],"spam_trend":trend})

@app.route("/api/detect", methods=["POST"])
def detect_spam():
    data = request.get_json()
    if not data: return jsonify({"error":"No data"}),400
    subject = data.get("subject",""); sender = data.get("sender",""); body = data.get("body","")
    if not body.strip(): return jsonify({"error":"Email body required"}),400
    prediction, confidence = predict_email(f"{subject} {body}")
    indicators = analyse_spam_indicators(subject,sender,body)
    high_count = sum(1 for i in indicators if i["severity"]=="high")
    med_count = sum(1 for i in indicators if i["severity"]=="medium")
    if prediction==1 and (high_count>=2 or confidence>0.9): risk_level="Critical"
    elif prediction==1 and (high_count>=1 or med_count>=2): risk_level="High"
    elif prediction==1: risk_level="Medium"
    elif len(indicators)>0: risk_level="Low"
    else: risk_level="Safe"
    db = get_db()
    db.execute("INSERT INTO emails(subject,sender,body,is_spam,prediction,confidence,spam_indicators,created_at) VALUES(?,?,?,?,?,?,?,?)",(subject,sender,body,prediction,prediction,round(confidence,4),json.dumps(indicators),datetime.now().isoformat()))
    db.commit()
    return jsonify({"prediction":"spam" if prediction==1 else "ham","is_spam":prediction==1,"confidence":round(confidence*100,1),"indicators":indicators,"risk_level":risk_level})

@app.route("/api/emails", methods=["GET"])
def list_emails():
    db = get_db()
    filter_type = request.args.get("filter","all")
    page = int(request.args.get("page",1)); per_page = int(request.args.get("per_page",20))
    search = request.args.get("search","").strip(); offset = (page-1)*per_page
    where_clauses = []; params = []
    if filter_type=="spam": where_clauses.append("is_spam=1")
    elif filter_type=="ham": where_clauses.append("is_spam=0")
    if search:
        where_clauses.append("(subject LIKE ? OR sender LIKE ? OR body LIKE ?)")
        params.extend([f"%{search}%",f"%{search}%",f"%{search}%"])
    where_sql = ("WHERE "+" AND ".join(where_clauses)) if where_clauses else ""
    total = db.execute(f"SELECT COUNT(*) FROM emails {where_sql}",params).fetchone()[0]
    rows = db.execute(f"SELECT id,subject,sender,body,is_spam,prediction,confidence,spam_indicators,created_at FROM emails {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",params+[per_page,offset]).fetchall()
    emails = []
    for r in rows:
        e = dict(r); e["spam_indicators"] = json.loads(e["spam_indicators"]) if e["spam_indicators"] else []; emails.append(e)
    return jsonify({"emails":emails,"total":total,"page":page,"per_page":per_page,"total_pages":max(1,(total+per_page-1)//per_page)})

@app.route("/api/train", methods=["POST"])
def train():
    return jsonify(train_all_models())

@app.route("/api/analytics", methods=["GET"])
def analytics():
    db = get_db()
    trend_rows = db.execute("SELECT strftime('%Y-%m',created_at) AS month, SUM(CASE WHEN is_spam=1 THEN 1 ELSE 0 END) as spam, SUM(CASE WHEN is_spam=0 THEN 1 ELSE 0 END) as ham, COUNT(*) as total FROM emails GROUP BY month ORDER BY month").fetchall()
    trend = [{"month":r[0],"spam":r[1],"ham":r[2],"total":r[3]} for r in trend_rows]
    spam_bodies = db.execute("SELECT body FROM emails WHERE is_spam=1").fetchall()
    word_freq = {}
    for row in spam_bodies:
        text = row[0].lower()
        for kw in SPAM_KEYWORDS:
            if kw in text: word_freq[kw] = word_freq.get(kw,0)+1
    common_words = [{"word":w,"count":c} for w,c in sorted(word_freq.items(),key=lambda x:x[1],reverse=True)[:15]]
    hour_rows = db.execute("SELECT CAST(strftime('%H',created_at) AS INTEGER) AS hour, SUM(CASE WHEN is_spam=1 THEN 1 ELSE 0 END) as spam, SUM(CASE WHEN is_spam=0 THEN 1 ELSE 0 END) as ham FROM emails GROUP BY hour ORDER BY hour").fetchall()
    by_hour = [{"hour":r[0],"spam":r[1],"ham":r[2]} for r in hour_rows]
    sender_rows = db.execute("SELECT sender, COUNT(*) as cnt FROM emails WHERE is_spam=1 GROUP BY sender ORDER BY cnt DESC LIMIT 10").fetchall()
    top_senders = [{"sender":r[0],"count":r[1]} for r in sender_rows]
    return jsonify({"spam_trend":trend,"common_spam_words":common_words,"spam_by_hour":by_hour,"top_spam_senders":top_senders})

@app.route("/api/model-history", methods=["GET"])
def model_history():
    db = get_db()
    rows = db.execute("SELECT * FROM model_history ORDER BY trained_at DESC").fetchall()
    history = []
    for r in rows:
        h = dict(r); h["confusion_matrix"] = json.loads(h["confusion_matrix"]) if h["confusion_matrix"] else []; history.append(h)
    return jsonify({"history":history})

if __name__ == "__main__":
    init_db(); seed_database()
    print("[INIT] Training ML models...")
    train_all_models()
    print("[INIT] Ready on port 5005")
    app.run(debug=True, port=5005)