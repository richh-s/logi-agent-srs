import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    """
    Returns a Firestore client, initializing the Firebase Admin SDK on first call.
    Automatically detects serviceAccountKey.json for local dev, otherwise uses ADC.
    """
    global _db
    if _db is None:
        if not firebase_admin._apps:
            key_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "serviceAccountKey.json")
            if os.path.exists(key_path):
                cred = credentials.Certificate(key_path)
                firebase_admin.initialize_app(cred)
            else:
                firebase_admin.initialize_app()
        _db = firestore.client()
    return _db
