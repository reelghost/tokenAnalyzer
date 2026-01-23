from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import uvicorn
import requests
from datetime import datetime, timedelta, timezone
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

    return db


def save_token_data(token_data: list):
    db = get_db()
    collection = db["token_bills"]

    # Unique compound index to prevent duplicates
    collection.create_index(
        [("meter_number", ASCENDING), ("timestamp", ASCENDING)],
        unique=True
    )

    for item in token_data:
        try:
            collection.insert_one(item)
        except Exception:
            # Duplicate (same meter + timestamp) → ignore
            pass


def save_meter_number(meter_number: str):
    db = get_db()
    collection = db["kplc_meters"]

    # Unique compound index to prevent duplicates
    collection.create_index(
        [("meter_number", ASCENDING)],
        unique=True
    )
    
    try:
        collection.insert_one({"meter_number": meter_number})
    except Exception:
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
                "units": data.get("trnUnits")
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

    # Fetch & store bill data
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                KPLC_API_URL,
                params=params,
                headers=headers,
                timeout=10.0
            )
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
            # save meter number
            save_meter_number(meter_number)
            # 🔥 Fetch & store bill data as side-effect
            token_data = await fetch_token_bill_from_kplc(meter_number)
            save_token_data(token_data)
            return about_data

    except Exception as e:
        return {"error": "Check your meter number and try again"}


# ---------------- Token Bill (DB READ) ----------------
@app.get("/api/tokenbill/{meter_number}")
async def get_token_bill(meter_number: str, page: int = 1, limit: int = 10):
    collection = get_db()["token_bills"]
    
    # Calculate skip value
    skip = (page - 1) * limit
    
    # Get total count for pagination
    total = collection.count_documents({"meter_number": meter_number})
    
    # Fetch paginated bills
    bills = list(
        collection.find(
            {"meter_number": meter_number},
            {"_id": 0}
        ).sort("timestamp", -1).skip(skip).limit(limit)
    )

    return {
        "bills": bills,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit  # Ceiling division
    }


# ---------------- Token Analytics ----------------
@app.get("/api/tokenanalytics/{meter_number}")
async def get_token_analytics(meter_number: str):
    collection = get_db()["token_bills"]
    
    # Get all bills for analytics
    bills = list(
        collection.find(
            {"meter_number": meter_number},
            {"_id": 0, "timestamp": 1, "amount": 1, "units": 1}
        ).sort("timestamp", 1)
    )
    
    # Define Kenya Timezone (UTC+3)
    kenya_tz = timezone(timedelta(hours=3))
    
    if not bills:
        # Get current date in Kenya timezone
        now_kenya = datetime.now(kenya_tz)
        today_kenya = now_kenya.date()
        return {
            "total_amount": 0,
            "total_units": 0,
            "total_transactions": 0,
            "daily": {"data": [], "total_amount": 0, "total_units": 0, "count": 0, "label": today_kenya.strftime("%B %d, %Y")},
            "weekly": {"data": [], "total_amount": 0, "total_units": 0, "count": 0, "label": "This Week"},
            "monthly": {"data": [], "total_amount": 0, "total_units": 0, "count": 0, "label": "This Month"},
            "yearly": {"data": [], "total_amount": 0, "total_units": 0, "count": 0, "label": "This Year"}
        }
    
    # Get current date info in Kenya timezone
    now_kenya = datetime.now(kenya_tz)
    today_kenya = now_kenya.date()
    current_week_start = today_kenya - timedelta(days=today_kenya.weekday())
    current_week_end = current_week_start + timedelta(days=6)
    current_month = now_kenya.strftime("%Y-%m")
    current_year = now_kenya.strftime("%Y")
    
    # Calculate overall totals
    total_amount = sum(bill.get("amount", 0) for bill in bills)
    total_units = sum(float(bill.get("units", 0) or 0) for bill in bills)
    
    # Filter and group data for each period
    daily_data = {}  # Hourly breakdown for today
    weekly_data = {}  # Daily breakdown for this week
    monthly_data = {}  # Daily breakdown for this month
    yearly_data = {}  # Monthly breakdown for this year
    
    daily_totals = {"amount": 0, "units": 0, "count": 0}
    weekly_totals = {"amount": 0, "units": 0, "count": 0}
    monthly_totals = {"amount": 0, "units": 0, "count": 0}
    yearly_totals = {"amount": 0, "units": 0, "count": 0}
    
    for bill in bills:
        try:
            ts = bill.get("timestamp", "")
            if not ts:
                continue
            
            # Handle Unix epoch milliseconds (e.g., 1769070623000)
            if isinstance(ts, (int, float)) or (isinstance(ts, str) and ts.isdigit()):
                ts_value = int(ts)
                # Convert milliseconds to seconds
                if ts_value > 4102444800000: # Year 2100 in ms
                     ts_value = ts_value / 1000
                elif ts_value > 4102444800: # Year 2100 in s (so it's ms)
                     ts_value = ts_value / 1000
                
                # Create timezone-aware datetime in UTC then convert to Kenya
                dt = datetime.fromtimestamp(ts_value, tz=timezone.utc).astimezone(kenya_tz)
            else:
                # Fallback to ISO format parsing
                dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00")).astimezone(kenya_tz)
            
            bill_date = dt.date()
            amount = bill.get("amount", 0)
            units = float(bill.get("units", 0) or 0)
            
            # Daily: Today only (hourly breakdown)
            if bill_date == today_kenya:
                hour_key = dt.strftime("%H:00")
                if hour_key not in daily_data:
                    daily_data[hour_key] = {"date": hour_key, "amount": 0, "units": 0}
                daily_data[hour_key]["amount"] += amount
                daily_data[hour_key]["units"] += units
                daily_totals["amount"] += amount
                daily_totals["units"] += units
                daily_totals["count"] += 1
            
            # Weekly: This week only (daily breakdown)
            if current_week_start <= bill_date <= current_week_end:
                day_key = dt.strftime("%a %d")
                day_sort = dt.strftime("%Y-%m-%d")
                if day_sort not in weekly_data:
                    weekly_data[day_sort] = {"date": day_key, "sort": day_sort, "amount": 0, "units": 0}
                weekly_data[day_sort]["amount"] += amount
                weekly_data[day_sort]["units"] += units
                weekly_totals["amount"] += amount
                weekly_totals["units"] += units
                weekly_totals["count"] += 1
            
            # Monthly: This month only (daily breakdown)
            if dt.strftime("%Y-%m") == current_month:
                day_key = dt.strftime("%d %b")
                day_sort = dt.strftime("%Y-%m-%d")
                if day_sort not in monthly_data:
                    monthly_data[day_sort] = {"date": day_key, "sort": day_sort, "amount": 0, "units": 0}
                monthly_data[day_sort]["amount"] += amount
                monthly_data[day_sort]["units"] += units
                monthly_totals["amount"] += amount
                monthly_totals["units"] += units
                monthly_totals["count"] += 1
            
            # Yearly: This year only (monthly breakdown)
            if dt.strftime("%Y") == current_year:
                month_key = dt.strftime("%Y-%m")
                month_label = dt.strftime("%b")
                if month_key not in yearly_data:
                    yearly_data[month_key] = {"date": month_label, "sort": month_key, "amount": 0, "units": 0}
                yearly_data[month_key]["amount"] += amount
                yearly_data[month_key]["units"] += units
                yearly_totals["amount"] += amount
                yearly_totals["units"] += units
                yearly_totals["count"] += 1
                
        except Exception:
            continue
    
    # Sort and format data
    daily_list = sorted(daily_data.values(), key=lambda x: x["date"])
    weekly_list = sorted(weekly_data.values(), key=lambda x: x["sort"])
    monthly_list = sorted(monthly_data.values(), key=lambda x: x["sort"])
    yearly_list = sorted(yearly_data.values(), key=lambda x: x["sort"])
    
    # Remove sort keys from output
    for item in weekly_list + monthly_list + yearly_list:
        item.pop("sort", None)
    
    return {
        "total_amount": total_amount,
        "total_units": total_units,
        "total_transactions": len(bills),
        "daily": {
            "data": daily_list,
            "total_amount": daily_totals["amount"],
            "total_units": daily_totals["units"],
            "count": daily_totals["count"],
            "label": today_kenya.strftime("%B %d, %Y")
        },
        "weekly": {
            "data": weekly_list,
            "total_amount": weekly_totals["amount"],
            "total_units": weekly_totals["units"],
            "count": weekly_totals["count"],
            "label": f"{current_week_start.strftime('%b %d')} - {current_week_end.strftime('%b %d, %Y')}"
        },
        "monthly": {
            "data": monthly_list,
            "total_amount": monthly_totals["amount"],
            "total_units": monthly_totals["units"],
            "count": monthly_totals["count"],
            "label": now_kenya.strftime("%B %Y")
        },
        "yearly": {
            "data": yearly_list,
            "total_amount": yearly_totals["amount"],
            "total_units": yearly_totals["units"],
            "count": yearly_totals["count"],
            "label": current_year
        }
    }


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
