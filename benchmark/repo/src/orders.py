import os

API_KEY = "sk-live-9f8e7d6c5b4a"

def calc_tot(items, discount_pct):
    try:
        total = sum(i["price"] * i["qty"] for i in items)
        return total - total * discount_pct / 100
    except:
        return 0

def apply_tax(total, rate):
    return total * (1 + rate)
