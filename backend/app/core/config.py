from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Teltonika IoT Platform"
    # MySQL connection to XAMPP database (fallback por defecto)
    DATABASE_URL: str = "mysql+pymysql://root:@localhost:3306/teltonika"
    SECRET_KEY: str = "super_secret_jwt_key_for_telemetry_app_12345"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
