import sys, json

if len(sys.argv) > 1:
    with open(sys.argv[1], 'r', encoding='utf-8-sig') as f:
        d = json.load(f)
else:
    d = json.loads(sys.stdin.read())

# Get P0002 entries
p0002 = next((b for b in d['comparison'] if b['batchNumber'] == 'P0002'), None)
if not p0002:
    print("P0002 not found")
    sys.exit(1)

entries = p0002['stockInEntries']

# Group by date
from collections import defaultdict
by_date = defaultdict(list)
for e in entries:
    by_date[e['date']].append(e)

print(f"P0002 Stock-In Entries — {len(entries)} total entries\n")
print(f"{'Date':<14} {'Pack Size':<14} {'Qty':>6}   {'Daily Total':>12}")
print("-" * 55)

grand_total = 0
for date in sorted(by_date.keys()):
    day_entries = by_date[date]
    day_total = sum(e['quantity'] for e in day_entries)
    grand_total += day_total
    for i, e in enumerate(day_entries):
        if i == 0:
            print(f"{date:<14} {e['packSize']:<14} {e['quantity']:>6}")
        else:
            print(f"{'':14} {e['packSize']:<14} {e['quantity']:>6}")
    print(f"{'':14} {'DAY TOTAL':<14} {'':>6}   {day_total:>12}")
    print()

print("-" * 55)
print(f"{'GRAND TOTAL':>40}   {grand_total:>12}")
print(f"\n(User screen shows 3,941 — difference: {grand_total - 3941})")
