from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_username: str
    database_password: str
    database_host: str
    database_port: str
    database_name: str

    secret_key: str
    algorithm: str
    access_token_expire_minutes: int

    mail_username: str
    mail_password: str
    mail_from: str
    mail_from_name: str
    mail_port: int
    mail_server: str

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()