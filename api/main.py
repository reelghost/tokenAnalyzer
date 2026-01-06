from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import uvicorn
import requests
from datetime import datetime
from pymongo import MongoClient, ASCENDING
from pymongo.server_api import ServerApi


app = FastAPI(
    title="Token Analyzer API",
    description="API for fetching and storing KPLC token information",
    version="1.0.0"
)

# ---------------- CORS ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- MongoDB ----------------
def get_db():
    uri = "mongodb+srv://reelghost:00n4ceynRaD@kplccluster.nbsq7yi.mongodb.net/?appName=kplccluster"
    client = MongoClient(uri, server_api=ServerApi("1"))

    db = client["kplc"]
    collection = db["token_bills"]

    # Unique compound index to prevent duplicates
    collection.create_index(
        [("meter_number", ASCENDING), ("timestamp", ASCENDING)],
        unique=True
    )

    return collection


def save_token_data(token_data: list):
    collection = get_db()

    for item in token_data:
        try:
            collection.insert_one(item)
        except Exception:
            # Duplicate (same meter + timestamp) → ignore
            pass


# ---------------- KPLC AUTH ----------------
def get_api():
    api_url = "https://selfservice.kplc.co.ke/api/token"
    payload = {
        "grant_type": "client_credentials",
        "scope": (
            "token_public token_private "
            "accounts_private accounts_public "
            "attributes_public attributes_private "
            "customers_public customers_private "
            "documents_private documents_public "
            "listData_public "
            "rccs_private rccs_public "
            "sectorSupplies_private sectorSupplies_public "
            "selfReads_private selfReads_public "
            "serviceRequests_private serviceRequests_public "
            "services_private services_public "
            "streets_public "
            "supplies_private supplies_public "
            "users_private users_public "
            "workRequests_private workRequests_public "
            "notification_private "
            "outage_private "
            "juaforsure_private juaforsure_public "
            "prepayment_private "
            "pdfbill_private "
            "publicData_public "
            "selfReadsPeriod_private "
            "corporateAccount_private "
            "calculator_public "
            "sscalculator_public "
            "register_public register_private "
            "ssaccounts_public ssaccounts_private "
            "addaccount_public addaccount_private "
            "whtcertificate_private "
            "selfService_public selfService_private "
            "summaryLetters_private summaryLetter_public"
        )
    }

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Authorization": "Basic aVBXZkZTZTI2NkF2eVZHc2xpWk45Nl8yTzVzYTp3R3lRZEFFa3MzRm9lSkZHU0ZZUndFMERUdGNh"
    }

    response = requests.post(api_url, data=payload, headers=headers)
    return response.json().get("access_token")


# ---------------- Fetch bill data ----------------
async def fetch_token_bill_from_kplc(meter_number: str):
    BILL_URL = "https://selfservice.kplc.co.ke/api/publicData/4/newContractList"

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Authorization": f"Bearer {get_api()}"
    }

    params = {"serialNumberMeter": meter_number}

    async with httpx.AsyncClient() as client:
        response = await client.get(
            BILL_URL,
            params=params,
            headers=headers,
            timeout=10.0
        )
        response.raise_for_status()

        raw = response.json().get("data", [])[0].get("colPrepayment", [])

        token_data = []
        for data in raw:
            token_data.append({
                "meter_number": meter_number,
                "timestamp": data.get("trnTimestamp"),
                "tokenNo": data.get("tokenNo"),
                "amount": data.get("trnAmount", 0),
                "units": data.get("trnUnits"),
                "created_at": datetime.utcnow()
            })

        return token_data


# ---------------- Health ----------------
@app.get("/api/health")
async def health_check():
    return {"status": "API is running"}


# ---------------- Token About ----------------
@app.get("/api/tokenabout/{meter_number}")
async def get_token_data(meter_number: str):
    if not meter_number:
        raise HTTPException(status_code=400, detail="Meter number is required")

    KPLC_API_URL = "https://selfservice.kplc.co.ke/api/sectorSupplies/4/"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "Authorization": f"Bearer {get_api()}"
    }

    params = {"serialNumberMeter": meter_number}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                KPLC_API_URL,
                params=params,
                headers=headers,
                timeout=10.0
            )
            # response.raise_for_status()
            response_data = response.json()
            data = response_data.get("data", [{}])[0]
            about_data = {
                    "contractStatus": data.get("contractStatus", ""),
                    "address": data.get("address", ""),
                    "offeredService": data.get("descOfferedService", ""),
                    "connectionType": next(
                        (
                            item["value"]
                            for item in data.get("attributes", [])
                            if item.get("descAttribute") == "Connection Type"
                        ),
                        None
                    )
                }
            # 🔥 Fetch & store bill data as side-effect
            token_data = await fetch_token_bill_from_kplc(meter_number)
            save_token_data(token_data)
            return about_data

    except Exception as e:
        return {"error": "Check your meter number and try again"}


# ---------------- Token Bill (DB READ) ----------------
@app.get("/api/tokenbill/{meter_number}")
async def get_token_bill(meter_number: str):
    collection = get_db()

    bills = list(
        collection.find(
            {"meter_number": meter_number},
            {"_id": 0}
        ).sort("timestamp", -1)
    )

    if not bills:
        raise HTTPException(status_code=404, detail="No billing data found")

    return bills


# ---------------- Error handler ----------------
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )


# ---------------- Run ----------------
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        # host="0.0.0.0",
        port=8000,
        reload=True
    )
