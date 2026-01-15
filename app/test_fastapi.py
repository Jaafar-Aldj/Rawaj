from fastapi import FastAPI
from . import models
from .database import engine
from .routers import product, user


models.Base.metadata.create_all(bind=engine)
app = FastAPI()


app.include_router(user.router)
app.include_router(product.router)

@app.get('/')
async def root():
    return {'message':'Hello world!!!!'}


