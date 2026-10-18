from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Teltonika IoT Platform"
    # MySQL connection to XAMPP database (fallback por defecto)
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/teltonika"
    SECRET_KEY: str = "super_secret_jwt_key_for_telemetry_app_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week

    # SMTP Configuration (Brevo) - Las credenciales se cargan desde .env
    SMTP_HOST: str = "smtp-relay.brevo.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "bea0f3001@smtp-brevo.com"
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "notificaciones@industriascopai.com"
    EMAIL_FROM_NAME: str = "Industrias Copai Telematics"
    FRONTEND_URL: str = "https://industriascopai.com"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
