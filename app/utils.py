import os
import random
import string
from pwdlib import PasswordHash
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

password_hash = PasswordHash.recommended()


def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def hash_function(password: str) -> str:    
    return password_hash.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True
)

async def send_code_email(email: str, code: str):
    message = MessageSchema(
        subject="Rawaj Verification Code",
        recipients=[email],
        body=f"Your verification code is: {code}",
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)