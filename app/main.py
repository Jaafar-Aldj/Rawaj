from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
# from . import models
from .database import engine
from .routers import product, user, auth, campaign


# models.Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user.router)
app.include_router(product.router)
app.include_router(auth.router)
app.include_router(campaign.router)

app.mount("/assets", StaticFiles(directory="rawaj-frontend/assets"), name="assets")

@app.get('/')
async def root():
    return {'message':'Hello world!!!!'}




