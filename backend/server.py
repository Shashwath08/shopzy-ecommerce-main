"""ShopZy - Amazon-inspired eCommerce backend.
FastAPI + MongoDB (collections modeled like normalized 3NF tables).
"""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import bcrypt
import jwt
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Setup ----------
mongo_url = "mongodb://localhost:27017"

client = AsyncIOMotorClient(mongo_url)

db = client["ecommerce_db"]

JWT_SECRET = "secret123"

JWT_ALG = "HS256"
ACCESS_EXPIRE_MIN = 60 * 24 * 7  # 7 days

app = FastAPI(title="ShopZy API")
api = APIRouter(prefix="/api")
bearer = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shopzy")


# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_EXPIRE_MIN),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1, default=1)


class CartQtyIn(BaseModel):
    quantity: int = Field(ge=1)


class WishlistIn(BaseModel):
    product_id: str


class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = ""
    city: str
    state: str
    pincode: str
    country: str = "India"


class CheckoutIn(BaseModel):
    shipping_address: ShippingAddress
    payment_method: Literal["cod", "card", "upi"] = "cod"


class ReviewIn(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=1000)


class ProductIn(BaseModel):
    name: str
    description: str
    price: float = Field(gt=0)
    discount_pct: float = Field(ge=0, le=90, default=0)
    stock: int = Field(ge=0, default=10)
    category_id: str
    brand: str = ""
    images: List[str] = []


class OrderStatusIn(BaseModel):
    status: Literal["pending", "confirmed", "shipped", "delivered", "cancelled"]


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": body.name,
        "password_hash": hash_password(body.password),
        "role": "user",
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], email, "user")
    return {
        "token": token,
        "user": {"id": user["id"], "email": email, "name": body.name, "role": "user"},
    }


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], email, user.get("role", "user"))
    return {
        "token": token,
        "user": {"id": user["id"], "email": email, "name": user["name"], "role": user.get("role", "user")},
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------- Categories ----------
@api.get("/categories")
async def list_categories():
    cats = await db.categories.find({}, {"_id": 0}).to_list(100)
    return cats


# ---------- Products ----------
@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    sort: Optional[str] = Query(None, regex="^(price_asc|price_desc|rating|popularity|newest)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    featured: Optional[str] = None,
):
    query: dict = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    if category:
        query["category_slug"] = category
    if featured == "trending":
        query["trending"] = True
    if featured == "bestseller":
        query["bestseller"] = True

    sort_map = {
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("rating_avg", -1)],
        "popularity": [("rating_count", -1)],
        "newest": [("created_at", -1)],
    }
    cursor = db.products.find(query, {"_id": 0})
    if sort and sort in sort_map:
        cursor = cursor.sort(sort_map[sort])
    total = await db.products.count_documents(query)
    items = await cursor.skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@api.post("/products")
async def create_product(body: ProductIn, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": body.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category")
    product = {
        "id": str(uuid.uuid4()),
        **body.model_dump(),
        "category_slug": cat["slug"],
        "category_name": cat["name"],
        "rating_avg": 0.0,
        "rating_count": 0,
        "trending": False,
        "bestseller": False,
        "created_at": now_iso(),
    }
    await db.products.insert_one(product)
    product.pop("_id", None)
    return product


@api.put("/products/{product_id}")
async def update_product(product_id: str, body: ProductIn, _: dict = Depends(require_admin)):
    cat = await db.categories.find_one({"id": body.category_id}, {"_id": 0})
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category")
    update = {**body.model_dump(), "category_slug": cat["slug"], "category_name": cat["name"]}
    res = await db.products.update_one({"id": product_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"id": product_id}, {"_id": 0})


@api.delete("/products/{product_id}")
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    res = await db.products.delete_one({"id": product_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------- Cart ----------
async def _enrich_cart(user_id: str) -> dict:
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        return {"user_id": user_id, "items": [], "subtotal": 0}
    items = []
    subtotal = 0.0
    for it in cart.get("items", []):
        product = await db.products.find_one({"id": it["product_id"]}, {"_id": 0})
        if product:
            price = product["price"] * (1 - product.get("discount_pct", 0) / 100)
            line_total = round(price * it["quantity"], 2)
            subtotal += line_total
            items.append({
                "product_id": product["id"],
                "product_name": product["name"],
                "image": product["images"][0] if product.get("images") else "",
                "price": round(price, 2),
                "original_price": product["price"],
                "discount_pct": product.get("discount_pct", 0),
                "quantity": it["quantity"],
                "line_total": line_total,
                "stock": product.get("stock", 0),
            })
    return {"user_id": user_id, "items": items, "subtotal": round(subtotal, 2)}


@api.get("/cart")
async def get_cart(user: dict = Depends(get_current_user)):
    return await _enrich_cart(user["id"])


@api.post("/cart/add")
async def add_to_cart(body: CartItemIn, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        await db.carts.insert_one({
            "user_id": user["id"],
            "items": [{"product_id": body.product_id, "quantity": body.quantity}],
        })
    else:
        items = cart.get("items", [])
        found = False
        for it in items:
            if it["product_id"] == body.product_id:
                it["quantity"] += body.quantity
                found = True
                break
        if not found:
            items.append({"product_id": body.product_id, "quantity": body.quantity})
        await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return await _enrich_cart(user["id"])


@api.put("/cart/{product_id}")
async def update_cart_qty(product_id: str, body: CartQtyIn, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart empty")
    items = [it for it in cart.get("items", [])]
    for it in items:
        if it["product_id"] == product_id:
            it["quantity"] = body.quantity
            break
    else:
        raise HTTPException(status_code=404, detail="Item not in cart")
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return await _enrich_cart(user["id"])


@api.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": user["id"]})
    if not cart:
        return {"user_id": user["id"], "items": [], "subtotal": 0}
    items = [it for it in cart.get("items", []) if it["product_id"] != product_id]
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": items}})
    return await _enrich_cart(user["id"])


# ---------- Wishlist ----------
@api.get("/wishlist")
async def get_wishlist(user: dict = Depends(get_current_user)):
    wl = await db.wishlists.find_one({"user_id": user["id"]}, {"_id": 0})
    if not wl:
        return {"items": []}
    products = []
    for pid in wl.get("product_ids", []):
        p = await db.products.find_one({"id": pid}, {"_id": 0})
        if p:
            products.append(p)
    return {"items": products}


@api.post("/wishlist/toggle")
async def toggle_wishlist(body: WishlistIn, user: dict = Depends(get_current_user)):
    wl = await db.wishlists.find_one({"user_id": user["id"]})
    if not wl:
        await db.wishlists.insert_one({"user_id": user["id"], "product_ids": [body.product_id]})
        return {"added": True}
    ids = wl.get("product_ids", [])
    if body.product_id in ids:
        ids.remove(body.product_id)
        added = False
    else:
        ids.append(body.product_id)
        added = True
    await db.wishlists.update_one({"user_id": user["id"]}, {"$set": {"product_ids": ids}})
    return {"added": added}


# ---------- Orders ----------
@api.post("/orders")
async def place_order(body: CheckoutIn, user: dict = Depends(get_current_user)):
    cart = await _enrich_cart(user["id"])
    if not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")
    subtotal = cart["subtotal"]
    shipping = 0.0 if subtotal > 499 else 49.0
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + shipping + tax, 2)
    order = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_email": user["email"],
        "items": cart["items"],
        "shipping_address": body.shipping_address.model_dump(),
        "payment_method": body.payment_method,
        "subtotal": subtotal,
        "shipping": shipping,
        "tax": tax,
        "total": total,
        "status": "confirmed",
        "created_at": now_iso(),
    }
    await db.orders.insert_one(order)
    # decrement stock
    for it in cart["items"]:
        await db.products.update_one(
            {"id": it["product_id"]},
            {"$inc": {"stock": -it["quantity"]}},
        )
    # clear cart
    await db.carts.update_one({"user_id": user["id"]}, {"$set": {"items": []}})
    order.pop("_id", None)
    return order


@api.get("/orders")
async def list_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return orders


@api.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.get("role") != "admin" and order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return order


# ---------- Reviews ----------
@api.get("/products/{product_id}/reviews")
async def list_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews


@api.post("/reviews")
async def create_review(body: ReviewIn, user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": body.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    review = {
        "id": str(uuid.uuid4()),
        "product_id": body.product_id,
        "user_id": user["id"],
        "user_name": user["name"],
        "rating": body.rating,
        "comment": body.comment,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(review)
    # recompute aggregates
    pipeline = [
        {"$match": {"product_id": body.product_id}},
        {"$group": {"_id": "$product_id", "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.products.update_one(
            {"id": body.product_id},
            {"$set": {"rating_avg": round(agg[0]["avg"], 2), "rating_count": agg[0]["count"]}},
        )
    review.pop("_id", None)
    return review


# ---------- Admin ----------
@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    users = await db.users.count_documents({})
    products = await db.products.count_documents({})
    orders_list = await db.orders.find({}, {"_id": 0, "total": 1, "status": 1}).to_list(10000)
    revenue = sum(o.get("total", 0) for o in orders_list)
    return {
        "users": users,
        "products": products,
        "orders": len(orders_list),
        "revenue": round(revenue, 2),
        "pending_orders": sum(1 for o in orders_list if o.get("status") == "pending"),
    }


@api.get("/admin/orders")
async def admin_orders(_: dict = Depends(require_admin)):
    return await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.put("/admin/orders/{order_id}/status")
async def admin_update_order(order_id: str, body: OrderStatusIn, _: dict = Depends(require_admin)):
    res = await db.orders.update_one({"id": order_id}, {"$set": {"status": body.status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"ok": True}


@api.get("/admin/users")
async def admin_users(_: dict = Depends(require_admin)):
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)


@api.get("/")
async def root():
    return {"message": "ShopZy API"}


# ---------- Seed Data ----------
async def seed():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("name")
    await db.products.create_index("category_slug")

    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@shopzy.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": now_iso(),
        })
        logger.info("Seeded admin: %s", admin_email)
    # Test user
    if not await db.users.find_one({"email": "demo@shopzy.com"}):
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": "demo@shopzy.com",
            "name": "Demo User",
            "password_hash": hash_password("demo123"),
            "role": "user",
            "created_at": now_iso(),
        })

    # Categories
    cats_data = [
        {"slug": "electronics", "name": "Electronics", "image": "https://images.unsplash.com/photo-1591869754715-5f679687039c?w=400"},
        {"slug": "fashion", "name": "Fashion", "image": "https://images.unsplash.com/photo-1758274251734-072c6b996181?w=400"},
        {"slug": "home", "name": "Home Appliances", "image": "https://images.unsplash.com/photo-1765824142352-7bd73ea117f2?w=400"},
        {"slug": "books", "name": "Books", "image": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400"},
        {"slug": "beauty", "name": "Beauty", "image": "https://images.unsplash.com/photo-1522335789203-aaa597e6f777?w=400"},
        {"slug": "sports", "name": "Sports", "image": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400"},
    ]
    cat_map = {}
    for c in cats_data:
        existing = await db.categories.find_one({"slug": c["slug"]})
        if existing:
            cat_map[c["slug"]] = existing["id"]
        else:
            cid = str(uuid.uuid4())
            await db.categories.insert_one({"id": cid, **c})
            cat_map[c["slug"]] = cid

    # Products
    if await db.products.count_documents({}) == 0:
        products_seed = [
            # Electronics
            {"name": "Wireless Bluetooth Headphones Pro", "price": 4999, "discount_pct": 35, "category": "electronics", "brand": "SoundMax",
             "description": "Premium over-ear wireless headphones with active noise cancellation, 40-hour battery life, and Hi-Res audio support.",
             "images": ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600", "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600"],
             "trending": True, "bestseller": True, "rating_avg": 4.5, "rating_count": 1284},
            {"name": "Smart Watch Series 7", "price": 12999, "discount_pct": 20, "category": "electronics", "brand": "TechFit",
             "description": "Always-on Retina display, ECG, blood oxygen monitor, GPS, and 18-hour battery life. Water resistant 50m.",
             "images": ["https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600"],
             "trending": True, "bestseller": True, "rating_avg": 4.7, "rating_count": 892},
            {"name": "4K Ultra HD Smart TV 55 inch", "price": 42999, "discount_pct": 25, "category": "electronics", "brand": "VuTech",
             "description": "55-inch 4K HDR Smart LED TV with Dolby Vision, built-in Alexa, and 120Hz refresh rate.",
             "images": ["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600"],
             "bestseller": True, "rating_avg": 4.3, "rating_count": 567},
            {"name": "DSLR Camera 24MP with Lens Kit", "price": 38500, "discount_pct": 15, "category": "electronics", "brand": "PhotoPro",
             "description": "Professional DSLR camera with 24.1MP APS-C sensor, 18-55mm lens, 4K video, and Wi-Fi connectivity.",
             "images": ["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600"],
             "trending": True, "rating_avg": 4.6, "rating_count": 312},
            {"name": "Gaming Laptop RTX 4060 16GB RAM", "price": 89999, "discount_pct": 10, "category": "electronics", "brand": "GameForce",
             "description": "15.6-inch FHD 144Hz display, Intel i7-13700H, RTX 4060 8GB, 16GB DDR5 RAM, 1TB NVMe SSD.",
             "images": ["https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600"],
             "bestseller": True, "rating_avg": 4.8, "rating_count": 421},
            {"name": "Wireless Charging Pad Fast 15W", "price": 999, "discount_pct": 40, "category": "electronics", "brand": "ChargeUp",
             "description": "15W fast wireless charging pad compatible with all Qi-enabled devices. Slim, anti-slip design.",
             "images": ["https://images.unsplash.com/photo-1591290619762-c43b71a89033?w=600"],
             "rating_avg": 4.2, "rating_count": 178},

            # Fashion
            {"name": "Men's Slim Fit Casual Shirt", "price": 1499, "discount_pct": 50, "category": "fashion", "brand": "UrbanStyle",
             "description": "Premium cotton casual shirt with slim fit. Breathable fabric, available in multiple colors.",
             "images": ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600"],
             "trending": True, "rating_avg": 4.1, "rating_count": 234},
            {"name": "Women's Floral Summer Dress", "price": 1899, "discount_pct": 45, "category": "fashion", "brand": "BellaWear",
             "description": "Lightweight floral print dress, perfect for summer. V-neckline, knee length, A-line cut.",
             "images": ["https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600"],
             "bestseller": True, "trending": True, "rating_avg": 4.4, "rating_count": 456},
            {"name": "Leather Crossbody Bag", "price": 2499, "discount_pct": 30, "category": "fashion", "brand": "LuxLeather",
             "description": "Genuine leather crossbody bag with adjustable strap, multiple compartments, and gold-tone hardware.",
             "images": ["https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600"],
             "rating_avg": 4.5, "rating_count": 189},
            {"name": "Running Sports Shoes Men", "price": 3299, "discount_pct": 35, "category": "fashion", "brand": "RunFast",
             "description": "Lightweight breathable mesh running shoes with cushioned soles and excellent grip.",
             "images": ["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"],
             "bestseller": True, "rating_avg": 4.6, "rating_count": 723},
            {"name": "Classic Denim Jacket", "price": 2199, "discount_pct": 40, "category": "fashion", "brand": "DenimCo",
             "description": "Vintage-inspired denim jacket with button-front closure, chest pockets, and a relaxed fit.",
             "images": ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600"],
             "rating_avg": 4.2, "rating_count": 145},

            # Home
            {"name": "Robot Vacuum Cleaner Smart", "price": 18999, "discount_pct": 30, "category": "home", "brand": "CleanBot",
             "description": "Smart robot vacuum with LiDAR navigation, app control, auto-empty base, and 3-hour runtime.",
             "images": ["https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600"],
             "trending": True, "rating_avg": 4.4, "rating_count": 298},
            {"name": "Air Purifier with HEPA Filter", "price": 8999, "discount_pct": 25, "category": "home", "brand": "FreshAir",
             "description": "True HEPA H13 filtration removes 99.97% of particles. Covers up to 600 sq ft. Whisper-quiet.",
             "images": ["https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600"],
             "bestseller": True, "rating_avg": 4.5, "rating_count": 412},
            {"name": "Stand Mixer 5L Professional", "price": 24999, "discount_pct": 20, "category": "home", "brand": "ChefMate",
             "description": "1000W professional stand mixer with 5L stainless steel bowl, 10-speed control, and 3 attachments.",
             "images": ["https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600"],
             "rating_avg": 4.7, "rating_count": 187},
            {"name": "Espresso Coffee Machine", "price": 15999, "discount_pct": 22, "category": "home", "brand": "BaristaPro",
             "description": "15-bar pump espresso machine with milk frother, dual boiler, and programmable settings.",
             "images": ["https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=600"],
             "trending": True, "rating_avg": 4.6, "rating_count": 256},

            # Books
            {"name": "The Psychology of Money", "price": 399, "discount_pct": 20, "category": "books", "brand": "Jaico",
             "description": "Timeless lessons on wealth, greed, and happiness by Morgan Housel. Bestselling personal finance book.",
             "images": ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"],
             "bestseller": True, "rating_avg": 4.8, "rating_count": 2341},
            {"name": "Atomic Habits", "price": 499, "discount_pct": 25, "category": "books", "brand": "Random House",
             "description": "An easy and proven way to build good habits and break bad ones by James Clear.",
             "images": ["https://images.unsplash.com/photo-1589998059171-988d887df646?w=600"],
             "bestseller": True, "trending": True, "rating_avg": 4.9, "rating_count": 4521},
            {"name": "DBMS Concepts 7th Edition", "price": 850, "discount_pct": 15, "category": "books", "brand": "McGraw Hill",
             "description": "Database System Concepts by Silberschatz. Essential text for DBMS students and engineers.",
             "images": ["https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=600"],
             "rating_avg": 4.5, "rating_count": 312},

            # Beauty
            {"name": "Vitamin C Face Serum 30ml", "price": 699, "discount_pct": 30, "category": "beauty", "brand": "GlowSkin",
             "description": "Brightening Vitamin C serum with hyaluronic acid. Reduces dark spots and boosts radiance.",
             "images": ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600"],
             "trending": True, "rating_avg": 4.4, "rating_count": 567},
            {"name": "Luxury Perfume 50ml Unisex", "price": 2999, "discount_pct": 20, "category": "beauty", "brand": "Aurora",
             "description": "Long-lasting eau de parfum with notes of bergamot, jasmine, and sandalwood. Unisex fragrance.",
             "images": ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=600"],
             "bestseller": True, "rating_avg": 4.6, "rating_count": 234},
            {"name": "Makeup Brush Set 12 pcs", "price": 899, "discount_pct": 40, "category": "beauty", "brand": "BeautyTouch",
             "description": "Professional 12-piece makeup brush set with synthetic bristles and storage pouch.",
             "images": ["https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=600"],
             "rating_avg": 4.3, "rating_count": 189},

            # Sports
            {"name": "Yoga Mat Premium 6mm", "price": 999, "discount_pct": 35, "category": "sports", "brand": "FlexFit",
             "description": "Eco-friendly TPE yoga mat with non-slip texture, carrying strap included. 6mm thick.",
             "images": ["https://images.unsplash.com/photo-1591291621164-2c6367723315?w=600"],
             "trending": True, "rating_avg": 4.5, "rating_count": 412},
            {"name": "Dumbbell Set Adjustable 20kg", "price": 4499, "discount_pct": 25, "category": "sports", "brand": "PowerLift",
             "description": "Adjustable dumbbell set with iron plates (2x5kg + 2x2.5kg + 2x1.25kg) and rubberized handles.",
             "images": ["https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600"],
             "bestseller": True, "rating_avg": 4.7, "rating_count": 287},
            {"name": "Cricket Bat English Willow", "price": 5999, "discount_pct": 15, "category": "sports", "brand": "ProStrike",
             "description": "Grade 1 English willow cricket bat with premium handle. Suitable for tournament play.",
             "images": ["https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600"],
             "rating_avg": 4.4, "rating_count": 156},
        ]
        for p in products_seed:
            cat_slug = p.pop("category")
            doc = {
                "id": str(uuid.uuid4()),
                "category_id": cat_map[cat_slug],
                "category_slug": cat_slug,
                "category_name": next(c["name"] for c in cats_data if c["slug"] == cat_slug),
                "stock": 50,
                "trending": p.pop("trending", False),
                "bestseller": p.pop("bestseller", False),
                "rating_avg": p.pop("rating_avg", 0.0),
                "rating_count": p.pop("rating_count", 0),
                "created_at": now_iso(),
                **p,
            }
            await db.products.insert_one(doc)
        logger.info("Seeded %d products", len(products_seed))


@app.on_event("startup")
async def on_startup():
    try:
        await seed()
    except Exception as e:
        logger.exception("Seed failed: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)