from datetime import datetime
import random
import string
from pwdlib import PasswordHash
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from .config import settings

password_hash = PasswordHash.recommended()


def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

def hash_function(password: str) -> str:    
    return password_hash.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


conf = ConnectionConfig(
    MAIL_USERNAME = settings.mail_username,
    MAIL_PASSWORD = settings.mail_password,
    MAIL_FROM = settings.mail_from,
    MAIL_PORT = settings.mail_port,
    MAIL_SERVER = settings.mail_server,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
)

async def send_code_email(email: str, code: str):
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">منصة رواج | Rawaj</h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background-color: #ffffff; text-align: center;">
            <h2 style="color: #333333; margin-bottom: 20px;">مرحباً بك في رواج!</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                شكراً لتسجيلك معنا. لإكمال عملية تفعيل حسابك، يرجى استخدام رمز التحقق أدناه:
            </p>
            
            <!-- Code Box -->
            <div style="margin: 30px 0; padding: 15px; background-color: #f8f9fa; border: 2px dashed #007bff; border-radius: 5px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">{code}</span>
            </div>
            
            <p style="color: #777777; font-size: 14px;">
                إذا لم تقم بإنشاء حساب في منصتنا، يرجى تجاهل هذه الرسالة.
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
                © {datetime.now().year} Rawaj Platform. All rights reserved.
            </p>
        </div>
    </div>
    """
    message = MessageSchema(
        subject="تأكيد حسابك في منصة رواج | Rawaj Verification Code",
        recipients=[email],
        body=html_body,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)

async def send_reset_password_email(email: str, code: str):
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #2c3e50; padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0;">منصة رواج | Rawaj</h1>
        </div>
        <div style="padding: 30px; background-color: #ffffff; text-align: center;">
            <h2 style="color: #333333; margin-bottom: 20px;">استعادة كلمة المرور</h2>
            <p style="color: #555555; font-size: 16px; line-height: 1.5;">
                لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. استخدم الرمز التالي لإكمال العملية:
            </p>
            <div style="margin: 30px 0; padding: 15px; background-color: #f8f9fa; border: 2px dashed #e74c3c; border-radius: 5px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; color: #e74c3c; letter-spacing: 5px;">{code}</span>
            </div>
            <p style="color: #777777; font-size: 14px;">
                إذا لم تقم بطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذه الرسالة فوراً لحماية حسابك.
            </p>
        </div>
        <div style="background-color: #f1f1f1; padding: 15px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
                © {datetime.now().year} Rawaj Platform. All rights reserved.
            </p>
        </div>
    </div>
    """

    message = MessageSchema(
        subject="إعادة تعيين كلمة المرور | Password Reset - Rawaj",
        recipients=[email],
        body=html_body,
        subtype="html"
    )
    
    fm = FastMail(conf)
    await fm.send_message(message)