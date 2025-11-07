from settings import Settings
from service import app


if __name__ == "__main__":
    app.run(host=Settings.FLASK_HOST, port=Settings.FLASK_PORT)