"""Generates the new practice and mock-test questions.

Every answer is computed from the numbers in the question, so keys are correct by construction.
Output: new_questions.json = {"maths_mixed": [...130], "reasoning_mixed": [...130], "mq": {slug: [...]}}
"""
import json, random, math, datetime
from fractions import Fraction

rng = random.Random(20261109)
SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")


def sup(n): return str(n).translate(SUP)


def ind(n):
    """Indian digit grouping: 125000 -> 1,25,000"""
    neg = n < 0; n = abs(n)
    s = str(n)
    if len(s) > 3:
        head, tail = s[:-3], s[-3:]
        parts = []
        while len(head) > 2:
            parts.insert(0, head[-2:]); head = head[:-2]
        if head: parts.insert(0, head)
        s = ",".join(parts) + "," + tail
    return ("-" if neg else "") + s


def num(x):
    """Pretty number: int if whole, else up to 2 decimals."""
    if isinstance(x, Fraction):
        x = float(x)
    if abs(x - round(x)) < 1e-9:
        return ind(int(round(x)))
    return ("%.2f" % x).rstrip("0").rstrip(".")


def rs(x): return "Rs. " + num(x)


def ordn(n):
    n = int(n)
    if 10 <= n % 100 <= 20: return f"{n}th"
    return f"{n}" + {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")


def opts_from(correct, distract):
    """Return (options, key) with 4 distinct options."""
    seen, ds = {correct}, []
    for d in distract:
        if d not in seen:
            seen.add(d); ds.append(d)
        if len(ds) == 3:
            break
    assert len(ds) == 3, (correct, distract)
    o = ds + [correct]
    rng.shuffle(o)
    return o, o.index(correct)


def near_ints(ans, steps=(1, 2, 3, -1, -2, 4, 5, -3, 6, 10, -5)):
    return [ans + s for s in steps if ans + s > 0]


# ------------------------------------------------------------------ MATHS
M = []


def maths(slug):
    def deco(f):
        M.append((slug, f)); return f
    return deco


@maths("percentage")
def pct_of():
    p = rng.choice([12, 15, 18, 24, 25, 35, 45, 60, 64, 75, 85, 120, 16, 36])
    while True:
        n = rng.choice(range(100, 3001, 25))
        if p * n % 100 == 0: break
    a = p * n // 100
    d = [num((p + 5) * n / 100), num((p - 5) * n / 100), num(a + n // 10), num(a - n // 20), num(a * 2)]
    return f"What is {p}% of {ind(n)}?", num(a), d, [f"{p}% of {ind(n)} = ({p}/100) × {ind(n)}.", f"= {num(a)}."]


@maths("percentage")
def pct_number():
    p = rng.choice([15, 20, 25, 30, 35, 40, 45, 60, 75, 80, 12, 64])
    while True:
        n = rng.choice(range(100, 2501, 20))
        if p * n % 100 == 0: break
    x = p * n // 100
    d = [num(n + n // 10), num(n - n // 10), num(n * 2), num(x * p / 100), num(n + n // 5)]
    return f"If {p}% of a number is {ind(x)}, what is the number?", num(n), d, [f"Let the number be N. Then ({p}/100) × N = {ind(x)}.", f"N = {ind(x)} × 100/{p} = {ind(n)}."]


@maths("percentage")
def pct_successive():
    a, b = rng.choice([(20, 10), (10, 20), (25, 20), (20, 20), (30, 10), (50, 20), (40, 25), (10, 10), (30, 30), (50, 50), (20, 25), (60, 25), (40, 50), (25, 10)])
    net = a - b - a * b / 100
    item = rng.choice(["a book", "a shirt", "a bicycle", "a mobile phone", "a bag of rice", "a watch"])
    word = lambda v: "No change" if abs(v) < 1e-9 else (num(abs(v)) + "% " + ("increase" if v > 0 else "decrease"))
    d = [word(a - b) if a != b else "2% increase", word(-(a * b / 100)), word(a + b), word(-net) if abs(net) > 1e-9 else "1% decrease", word(net + 1)]
    return (f"The price of {item} is first increased by {a}% and then decreased by {b}%. What is the net percentage change in its price?",
            word(net), d, [f"Net change = a − b − ab/100 = {a} − {b} − ({a}×{b})/100.", f"= {num(net)}%, so the answer is: {word(net)}."])


@maths("profit-loss")
def profit_sp():
    p = rng.choice([8, 10, 12, 15, 20, 25, 30, 40])
    while True:
        c = rng.choice(range(400, 6001, 50))
        if c * p % 100 == 0: break
    s = c * (100 + p) // 100
    d = [rs(c * (100 - p) / 100), rs(c + p), rs(s + c // 10), rs(s - c // 20), rs(c + 2 * p * c // 100)]
    return f"A shopkeeper buys an article for Rs. {ind(c)} and sells it at a profit of {p}%. What is the selling price?", rs(s), d, [f"SP = CP × (100 + {p})/100 = {ind(c)} × {100 + p}/100.", f"= Rs. {ind(s)}."]


@maths("profit-loss")
def profit_pct():
    p = rng.choice([5, 8, 10, 12, 15, 20, 25, 30])
    gain = rng.random() < 0.6
    while True:
        c = rng.choice(range(200, 5001, 50))
        if c * p % 100 == 0: break
    s = c * (100 + p) // 100 if gain else c * (100 - p) // 100
    w = lambda v, g: f"{num(v)}% {'profit' if g else 'loss'}"
    d = [w(p, not gain), w(p + 5, gain), w(p - 2 if p > 2 else p + 3, gain), w(round(abs(s - c) * 100 / s, 2), gain)]
    return (f"An article bought for Rs. {ind(c)} is sold for Rs. {ind(s)}. Find the profit or loss per cent.", w(p, gain), d,
            [f"{'Profit' if gain else 'Loss'} = {ind(abs(s - c))}.", f"{'Profit' if gain else 'Loss'}% = {ind(abs(s - c))}/{ind(c)} × 100 = {p}%."])


@maths("profit-loss")
def discount():
    dd = rng.choice([10, 12, 15, 20, 25, 30, 5, 40])
    while True:
        mp = rng.choice(range(500, 8001, 100))
        if mp * dd % 100 == 0: break
    s = mp * (100 - dd) // 100
    d = [rs(mp * (100 + dd) / 100), rs(mp - dd), rs(s - mp // 20), rs(s + mp // 20), rs(mp * dd / 100)]
    return f"The marked price of a jacket is Rs. {ind(mp)}. A discount of {dd}% is given. What is the selling price?", rs(s), d, [f"Discount = {dd}% of {ind(mp)} = {ind(mp * dd // 100)}.", f"SP = {ind(mp)} − {ind(mp * dd // 100)} = Rs. {ind(s)}."]


@maths("profit-loss")
def succ_discount():
    a, b = rng.choice([(10, 10), (20, 10), (20, 20), (25, 20), (30, 20), (10, 5), (15, 10), (40, 10), (50, 20), (25, 10), (30, 10), (20, 5)])
    e = a + b - a * b / 100
    d = [num(a + b) + "%", num(e + 2) + "%", num(e - 3) + "%", num(a * b / 10) + "%", num(abs(a - b) + 1) + "%"]
    return f"Two successive discounts of {a}% and {b}% are equal to a single discount of:", num(e) + "%", d, [f"Single discount = a + b − ab/100 = {a} + {b} − {a * b}/100.", f"= {num(e)}%."]


@maths("simple-interest")
def si():
    r = rng.choice([4, 5, 6, 8, 10, 12, 15])
    t = rng.choice([2, 3, 4, 5, 6])
    while True:
        p = rng.choice(range(1000, 30001, 500))
        if p * r * t % 100 == 0: break
    s = p * r * t // 100
    if rng.random() < 0.5:
        d = [rs(s + p * r // 100), rs(s - p * r // 100), rs(p + s), rs(s * 2)]
        return f"Find the simple interest on Rs. {ind(p)} at {r}% per annum for {t} years.", rs(s), d, [f"SI = P × R × T/100 = {ind(p)} × {r} × {t}/100.", f"= Rs. {ind(s)}."]
    d = [rs(s), rs(p + s + p * r // 100), rs(p + s - p * r // 100), rs(p * 2)]
    return f"What amount will Rs. {ind(p)} become in {t} years at {r}% per annum simple interest?", rs(p + s), d, [f"SI = {ind(p)} × {r} × {t}/100 = {ind(s)}.", f"Amount = {ind(p)} + {ind(s)} = Rs. {ind(p + s)}."]


@maths("simple-interest")
def si_rate():
    r = rng.choice([4, 5, 6, 8, 10, 12, 15])
    t = rng.choice([2, 3, 4, 5])
    while True:
        p = rng.choice(range(1000, 20001, 500))
        if p * r * t % 100 == 0: break
    a = p + p * r * t // 100
    d = [f"{r + 1}%", f"{r - 1}%", f"{r + 2}%", f"{r * 2}%", f"{r + 3}%"]
    return f"A sum of Rs. {ind(p)} amounts to Rs. {ind(a)} in {t} years at simple interest. What is the rate of interest per annum?", f"{r}%", d, [f"SI = {ind(a)} − {ind(p)} = {ind(a - p)}.", f"R = SI × 100/(P × T) = {ind(a - p)} × 100/({ind(p)} × {t}) = {r}%."]


@maths("compound-interest")
def ci2():
    r, mult = rng.choice([(10, 100), (20, 25), (5, 400), (4, 625), (10, 100), (20, 25)])
    p = mult * rng.choice(range(10, 121))
    amt = Fraction(p) * Fraction(100 + r, 100) ** 2
    ci = amt - p
    si = Fraction(p * r * 2, 100)
    d = [rs(si), rs(ci + p), rs(ci + r * 10), rs(ci - r * 5)]
    return f"Find the compound interest on Rs. {ind(p)} for 2 years at {r}% per annum, compounded annually.", rs(ci), d, [f"Amount = {ind(p)} × (1 + {r}/100)² = {num(amt)}.", f"CI = {num(amt)} − {ind(p)} = Rs. {num(ci)}."]


@maths("compound-interest")
def ci_si_diff():
    r, mult = rng.choice([(10, 100), (5, 400), (20, 25), (4, 625)])
    p = mult * rng.choice(range(5, 101))
    diff = Fraction(p) * Fraction(r, 100) ** 2
    d = [rs(diff * 2), rs(diff + r), rs(diff * 3), rs(p * r / 100)]
    return f"What is the difference between compound interest and simple interest on Rs. {ind(p)} for 2 years at {r}% per annum?", rs(diff), d, [f"For 2 years, CI − SI = P × (R/100)².", f"= {ind(p)} × ({r}/100)² = Rs. {num(diff)}."]


@maths("ratio-proportion")
def ratio_divide():
    a, b = rng.choice([(2, 3), (3, 5), (4, 5), (5, 7), (3, 4), (2, 5), (7, 9), (5, 8), (1, 3), (4, 7)])
    k = rng.choice(range(50, 1501, 10))
    n = (a + b) * k
    who = rng.choice([("Ravi", "Tenzing"), ("Nima", "Yarin"), ("Tana", "Pema"), ("Rina", "Kago")])
    d = [rs(b * k), rs(a * k + k), rs(n // 2), rs(a * k - k)]
    return f"Rs. {ind(n)} is divided between {who[0]} and {who[1]} in the ratio {a}:{b}. What is {who[0]}'s share?", rs(a * k), d, [f"Total parts = {a} + {b} = {a + b}.", f"{who[0]}'s share = {ind(n)} × {a}/{a + b} = Rs. {ind(a * k)}."]


@maths("ratio-proportion")
def ratio_chain():
    while True:
        a, b, c, d_ = [rng.randint(1, 9) for _ in range(4)]
        if a != b and c != d_ and math.gcd(a, b) == 1 and math.gcd(c, d_) == 1: break
    x, y = a * c, b * d_
    g = math.gcd(x, y); x //= g; y //= g
    d = [f"{a * d_ // math.gcd(a * d_, b * c)}:{b * c // math.gcd(a * d_, b * c)}", f"{y}:{x}", f"{a + c}:{b + d_}", f"{x + 1}:{y}"]
    return f"If A:B = {a}:{b} and B:C = {c}:{d_}, find A:C.", f"{x}:{y}", d, [f"A/C = (A/B) × (B/C) = ({a}/{b}) × ({c}/{d_}) = {a * c}/{b * d_}.", f"A:C = {x}:{y}."]


@maths("ratio-proportion")
def mean_prop():
    a, b = rng.choice([(4, 9), (9, 16), (4, 25), (8, 18), (12, 27), (16, 25), (2, 32), (9, 49), (3, 27), (5, 45), (16, 36), (25, 36), (6, 24), (7, 28)])
    m = int(math.isqrt(a * b))
    d = [str((a + b) // 2), str(m + 2), str(m - 2), str(m * 2)]
    return f"Find the mean proportional between {a} and {b}.", str(m), d, [f"Mean proportional = √({a} × {b}) = √{a * b}.", f"= {m}."]


@maths("series-average")
def avg_add():
    n = rng.choice([4, 5, 6, 7, 8, 9])
    while True:
        m = rng.randint(20, 80); x = rng.randint(10, 150)
        if (n * m + x) % (n + 1) == 0 and x != m: break
    na = (n * m + x) // (n + 1)
    d = [str(na + 1), str(na - 1), str((m + x) // 2), str(na + 2)]
    return f"The average of {n} numbers is {m}. If the number {x} is added, what is the new average?", str(na), d, [f"Sum of {n} numbers = {n} × {m} = {n * m}.", f"New average = ({n * m} + {x})/{n + 1} = {na}."]


@maths("series-average")
def ap_term():
    a = rng.randint(2, 30); dd = rng.randint(2, 9); n = rng.randint(12, 40)
    t = a + (n - 1) * dd
    seq = ", ".join(str(a + i * dd) for i in range(4))
    d = [str(t + dd), str(t - dd), str(a + n * dd), str(t + 1)]
    return f"What is the {ordn(n)} term of the series {seq}, …?", str(t), d, [f"First term a = {a}, common difference d = {dd}.", f"Tₙ = a + (n − 1)d = {a} + {n - 1} × {dd} = {t}."]


@maths("series-average")
def ap_sum():
    n = rng.choice([10, 12, 15, 20, 25, 30, 40, 50])
    kind = rng.choice(["natural", "odd", "even"])
    if kind == "natural":
        s = n * (n + 1) // 2; st = [f"Sum = n(n + 1)/2 = {n} × {n + 1}/2.", f"= {s}."]; q = f"What is the sum of the first {n} natural numbers?"
    elif kind == "odd":
        s = n * n; st = [f"Sum of the first n odd numbers = n².", f"= {n}² = {s}."]; q = f"What is the sum of the first {n} odd numbers?"
    else:
        s = n * (n + 1); st = [f"Sum of the first n even numbers = n(n + 1).", f"= {n} × {n + 1} = {s}."]; q = f"What is the sum of the first {n} even numbers?"
    d = [str(s + n), str(s - n), str(n * n + 1 if kind != "odd" else n * (n + 1)), str(s * 2)]
    return q, str(s), d, st


@maths("lcm-hcf")
def lcm_hcf():
    h = rng.choice([2, 3, 4, 5, 6, 7, 8, 9, 12, 15])
    while True:
        p, q = rng.randint(2, 15), rng.randint(2, 15)
        if p != q and math.gcd(p, q) == 1: break
    a, b = h * p, h * q
    if rng.random() < 0.5:
        d = [str(h * 2), str(h + 1), str(h * p), str(math.gcd(a, b + h) if math.gcd(a, b + h) != h else h * 3)]
        return f"What is the HCF of {a} and {b}?", str(h), d, [f"{a} = {h} × {p} and {b} = {h} × {q}.", f"{p} and {q} have no common factor, so HCF = {h}."]
    l = h * p * q
    d = [str(a * b), str(l * 2), str(l // 2 if l % 2 == 0 else l + h), str(l + h * p)]
    return f"What is the LCM of {a} and {b}?", str(l), d, [f"HCF of {a} and {b} = {h}.", f"LCM = {a} × {b}/{h} = {l}."]


@maths("lcm-hcf")
def hcf_product():
    h = rng.choice([3, 4, 5, 6, 8, 9, 11, 12, 13, 15])
    while True:
        p, q = rng.randint(2, 12), rng.randint(2, 12)
        if p != q and math.gcd(p, q) == 1: break
    prod, l = h * p * h * q, h * p * q
    d = [str(l * h), str(prod // 2), str(l + h), str(l - h)]
    return f"The product of two numbers is {ind(prod)} and their HCF is {h}. What is their LCM?", str(l), d, [f"Product of two numbers = HCF × LCM.", f"LCM = {ind(prod)}/{h} = {l}."]


@maths("lcm-hcf")
def least_div():
    trip = rng.choice([(12, 15, 20), (8, 12, 18), (6, 9, 15), (10, 12, 15), (16, 24, 36), (18, 27, 36), (9, 12, 18), (14, 21, 28), (15, 20, 25), (20, 30, 45), (6, 10, 14), (4, 6, 9)])
    l = math.lcm(*trip)
    r = rng.choice([0, 0, 3, 5, 7])
    if r == 0:
        d = [str(l * 2), str(l // 2 if l % 2 == 0 else l + 6), str(trip[0] * trip[1]), str(l + trip[0])]
        return f"What is the least number exactly divisible by {trip[0]}, {trip[1]} and {trip[2]}?", str(l), d, [f"Required number = LCM of {trip[0]}, {trip[1]} and {trip[2]}.", f"= {l}."]
    d = [str(l), str(l * 2 + r), str(l + r + 1), str(l - r)]
    return f"What is the least number which leaves a remainder of {r} when divided by {trip[0]}, {trip[1]} or {trip[2]}?", str(l + r), d, [f"LCM of {trip[0]}, {trip[1]} and {trip[2]} = {l}.", f"Required number = {l} + {r} = {l + r}."]


@maths("number-system")
def unit_digit():
    a = rng.choice([2, 3, 4, 7, 8, 9, 12, 13, 17, 23, 27, 33, 38])
    n = rng.randint(21, 199)
    ans = pow(a, n, 10)
    d = [str((ans + k) % 10) for k in (1, 2, 3, 5, 7, 4)]
    cyc = []
    v = a % 10
    while True:
        u = pow(a % 10, len(cyc) + 1, 10)
        if u in cyc: break
        cyc.append(u)
    L = len(cyc); pos = n % L or L
    return f"What is the unit digit of {a}{sup(n)}?", str(ans), d, [f"Unit digits of powers of {a % 10} repeat in the cycle " + ", ".join(map(str, cyc)) + f" (length {L}).",
        f"{n} ÷ {L} leaves remainder {n % L}" + (f", so take the last digit of the cycle" if n % L == 0 else f", so take position {pos}") + f": the unit digit is {ans}."]


@maths("number-system")
def factors():
    a, b, c = rng.choice([(2, 1, 1), (3, 2, 0), (2, 2, 1), (4, 1, 1), (3, 1, 2), (1, 3, 1), (5, 2, 0), (2, 3, 0), (3, 3, 1), (4, 2, 1), (1, 1, 2), (6, 1, 0)])
    n = 2 ** a * 3 ** b * 5 ** c
    t = (a + 1) * (b + 1) * (c + 1)
    form = " × ".join(x for x in (f"2{sup(a)}" if a > 1 else ("2" if a else ""), f"3{sup(b)}" if b > 1 else ("3" if b else ""), f"5{sup(c)}" if c > 1 else ("5" if c else "")) if x)
    d = [str(t + 2), str(t - 2), str(a + b + c), str(t + 4)]
    return f"How many factors does {ind(n)} have?", str(t), d, [f"{ind(n)} = {form}.", f"Number of factors = " + " × ".join(f"({e} + 1)" for e in (a, b, c) if e) + f" = {t}."]


@maths("number-system")
def divisible():
    k = rng.choice([3, 9, 11, 4, 8])
    while True:
        n = rng.randint(10000, 99999)
        if n % k == 0: break
    wrong = []
    while len(wrong) < 5:
        w = rng.randint(10000, 99999)
        if w % k and str(w) not in wrong: wrong.append(str(w))
    rule = {3: "the sum of its digits is divisible by 3", 9: "the sum of its digits is divisible by 9", 11: "the difference between the sums of alternate digits is 0 or divisible by 11",
            4: "the number formed by its last two digits is divisible by 4", 8: "the number formed by its last three digits is divisible by 8"}[k]
    return f"Which of the following numbers is divisible by {k}?", str(n), wrong, [f"A number is divisible by {k} if {rule}.", f"Only {n} satisfies this test."]


@maths("time-work")
def work_together():
    a, b, t = rng.choice([(10, 15, 6), (12, 24, 8), (20, 30, 12), (6, 12, 4), (15, 30, 10), (18, 36, 12), (20, 20, 10), (24, 12, 8), (12, 4, 3), (30, 60, 20), (40, 60, 24), (9, 18, 6), (21, 42, 14), (10, 40, 8), (36, 45, 20)])
    nm = rng.choice([("Ravi", "Sonam"), ("Tani", "Yamang"), ("A", "B"), ("Mohan", "Biri")])
    d = [f"{(a + b) // 2} days", f"{t + 2} days", f"{t - 1} days", f"{a + b} days"]
    return f"{nm[0]} can finish a work in {a} days and {nm[1]} can finish it in {b} days. In how many days can they finish it together?", f"{t} days", d, [f"One day's work together = 1/{a} + 1/{b} = 1/{t}.", f"So they finish the work in {t} days."]


@maths("time-work")
def pipes():
    a, b, t = rng.choice([(2, 3, 6), (3, 4, 12), (4, 6, 12), (6, 9, 18), (5, 10, 10), (4, 5, 20), (6, 8, 24), (10, 15, 30), (8, 12, 24), (3, 6, 6), (12, 20, 30), (6, 10, 15)])
    d = [f"{t + 2} hours", f"{b - a} hours", f"{a + b} hours", f"{t // 2} hours" if t > 4 else f"{t + 4} hours"]
    return f"A pipe can fill a tank in {a} hours and another pipe can empty it in {b} hours. If both are opened together, in how much time will the empty tank be filled?", f"{t} hours", d, [f"Net filling in 1 hour = 1/{a} − 1/{b} = 1/{t}.", f"So the tank is filled in {t} hours."]


@maths("time-speed-distance")
def kmph():
    if rng.random() < 0.5:
        s = rng.choice(range(18, 217, 18)); v = s * 5 // 18
        d = [f"{v + 5} m/s", f"{v * 2} m/s", f"{s * 18 // 5} m/s" if s * 18 % 5 == 0 else f"{v - 3} m/s", f"{v - 2} m/s"]
        return f"Convert {s} km/h into m/s.", f"{v} m/s", d, [f"1 km/h = 5/18 m/s.", f"{s} × 5/18 = {v} m/s."]
    v = rng.choice(range(5, 61, 5)); s = v * 18 // 5
    d = [f"{s + 18} km/h", f"{v * 5 // 18 if v * 5 % 18 == 0 else s - 9} km/h", f"{s // 2} km/h", f"{s + 9} km/h"]
    return f"Convert {v} m/s into km/h.", f"{s} km/h", d, [f"1 m/s = 18/5 km/h.", f"{v} × 18/5 = {s} km/h."]


@maths("time-speed-distance")
def train_pole():
    s = rng.choice([36, 54, 72, 90, 108, 45, 63])
    v = s * 5 / 18
    while True:
        L = rng.choice(range(100, 601, 10))
        if abs(L / v - round(L / v)) < 1e-9: break
    t = round(L / v)
    if rng.random() < 0.5:
        d = [f"{t + 2} seconds", f"{t - 2} seconds", f"{t * 2} seconds", f"{t + 5} seconds"]
        return f"A train {L} m long is running at {s} km/h. In how much time will it cross a pole?", f"{t} seconds", d, [f"Speed = {s} × 5/18 = {num(v)} m/s.", f"Time = {L}/{num(v)} = {t} seconds."]
    while True:
        P = rng.choice(range(100, 501, 10))
        if abs((L + P) / v - round((L + P) / v)) < 1e-9: break
    t2 = round((L + P) / v)
    d = [f"{t} seconds", f"{t2 + 4} seconds", f"{t2 - 3} seconds", f"{round(P / v) if abs(P / v - round(P / v)) < 1e-9 else t2 + 8} seconds"]
    return f"A train {L} m long, running at {s} km/h, crosses a platform {P} m long. How much time does it take?", f"{t2} seconds", d, [f"Distance = {L} + {P} = {L + P} m; speed = {num(v)} m/s.", f"Time = {L + P}/{num(v)} = {t2} seconds."]


@maths("time-speed-distance")
def avg_speed():
    x, y, a = rng.choice([(40, 60, 48), (30, 60, 40), (20, 30, 24), (60, 90, 72), (36, 45, 40), (30, 70, 42), (40, 10, 16), (50, 75, 60), (45, 90, 60), (24, 40, 30)])
    d = [f"{(x + y) // 2} km/h", f"{a + 2} km/h", f"{a - 3} km/h", f"{a + 5} km/h"]
    return f"A person goes to a place at {x} km/h and comes back by the same road at {y} km/h. What is his average speed for the whole journey?", f"{a} km/h", d, [f"For equal distances, average speed = 2xy/(x + y).", f"= 2 × {x} × {y}/({x} + {y}) = {a} km/h."]


@maths("mensuration")
def mensuration():
    kind = rng.choice(["rect", "circle", "cube", "cyl", "circum", "square"])
    if kind == "rect":
        l, b = rng.randint(8, 40), rng.randint(5, 30)
        if rng.random() < 0.5:
            return f"Find the area of a rectangle {l} m long and {b} m wide.", f"{l * b} m²", [f"{2 * (l + b)} m²", f"{l * b + l} m²", f"{l * b - b} m²", f"{(l + b) ** 2} m²"], [f"Area = length × breadth = {l} × {b}.", f"= {l * b} m²."]
        return f"Find the perimeter of a rectangle {l} m long and {b} m wide.", f"{2 * (l + b)} m", [f"{l * b} m", f"{l + b} m", f"{2 * (l + b) + 4} m", f"{4 * l} m"], [f"Perimeter = 2(l + b) = 2({l} + {b}).", f"= {2 * (l + b)} m."]
    if kind == "square":
        a = rng.randint(6, 45)
        return f"The side of a square is {a} cm. What is its area?", f"{a * a} cm²", [f"{4 * a} cm²", f"{a * a + a} cm²", f"{2 * a * a} cm²", f"{a * a - 2 * a} cm²"], [f"Area = side² = {a}².", f"= {a * a} cm²."]
    if kind == "circle":
        r = 7 * rng.randint(1, 6)
        ar = 22 * r * r // 7
        return f"Find the area of a circle of radius {r} cm. (Use π = 22/7)", f"{ind(ar)} cm²", [f"{ind(44 * r // 7)} cm²", f"{ind(ar * 2)} cm²", f"{ind(ar + r)} cm²", f"{ind(22 * r * 2 // 7 * r)} cm²" if 22 * r * 2 // 7 * r != ar else f"{ind(ar - r)} cm²"], [f"Area = πr² = (22/7) × {r} × {r}.", f"= {ind(ar)} cm²."]
    if kind == "circum":
        r = 7 * rng.randint(1, 8)
        c = 44 * r // 7
        return f"Find the circumference of a circle of radius {r} cm. (Use π = 22/7)", f"{c} cm", [f"{22 * r // 7} cm", f"{c + 22} cm", f"{22 * r * r // 7} cm", f"{c * 2} cm"], [f"Circumference = 2πr = 2 × (22/7) × {r}.", f"= {c} cm."]
    if kind == "cube":
        a = rng.randint(3, 15)
        if rng.random() < 0.5:
            return f"Find the volume of a cube of edge {a} cm.", f"{ind(a ** 3)} cm³", [f"{ind(6 * a * a)} cm³", f"{ind(a ** 3 + a)} cm³", f"{ind(a * a)} cm³", f"{ind(a ** 3 - a * a)} cm³"], [f"Volume = a³ = {a}³.", f"= {ind(a ** 3)} cm³."]
        return f"Find the total surface area of a cube of edge {a} cm.", f"{ind(6 * a * a)} cm²", [f"{ind(a ** 3)} cm²", f"{ind(4 * a * a)} cm²", f"{ind(6 * a * a + a)} cm²", f"{ind(12 * a)} cm²"], [f"Total surface area = 6a² = 6 × {a}².", f"= {ind(6 * a * a)} cm²."]
    r = 7 * rng.randint(1, 3); h = rng.randint(5, 25)
    v = 22 * r * r * h // 7
    return f"Find the volume of a cylinder of radius {r} cm and height {h} cm. (Use π = 22/7)", f"{ind(v)} cm³", [f"{ind(44 * r * h // 7)} cm³", f"{ind(v + 22 * r)} cm³", f"{ind(v * 2)} cm³", f"{ind(v // h * (h + 1))} cm³"], [f"Volume = πr²h = (22/7) × {r} × {r} × {h}.", f"= {ind(v)} cm³."]


@maths("geometry")
def geometry():
    kind = rng.choice(["ratio", "polygon", "exterior", "pythag", "comp"])
    if kind == "ratio":
        while True:
            a, b, c = sorted(rng.sample(range(1, 10), 3))
            if 180 % (a + b + c) == 0: break
        k = 180 // (a + b + c)
        return f"The angles of a triangle are in the ratio {a}:{b}:{c}. What is the largest angle?", f"{c * k}°", [f"{b * k}°", f"{a * k}°", f"{c * k + 10}°", f"{180 - c * k}°" if 180 - c * k != b * k else f"{c * k - 5}°"], [f"Sum of parts = {a + b + c}; one part = 180/{a + b + c} = {k}°.", f"Largest angle = {c} × {k} = {c * k}°."]
    if kind == "polygon":
        n = rng.randint(5, 15)
        s = (n - 2) * 180
        return f"What is the sum of the interior angles of a polygon with {n} sides?", f"{ind(s)}°", [f"{ind(n * 180)}°", f"{ind(s - 180)}°", f"{ind(s + 360)}°", f"{ind((n - 1) * 180)}°"], [f"Sum of interior angles = (n − 2) × 180°.", f"= {n - 2} × 180 = {ind(s)}°."]
    if kind == "exterior":
        n = rng.choice([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36])
        e = 360 // n
        return f"What is the measure of each exterior angle of a regular polygon with {n} sides?", f"{e}°", [f"{180 - e}°", f"{e + 10}°", f"{e // 2 if e % 2 == 0 else e + 5}°", f"{e * 2}°"], [f"Each exterior angle = 360°/n.", f"= 360/{n} = {e}°."]
    if kind == "comp":
        x = rng.randint(12, 80)
        if rng.random() < 0.5:
            return f"What is the complement of an angle of {x}°?", f"{90 - x}°", [f"{180 - x}°", f"{90 - x + 10}°", f"{x}°" if x != 90 - x else f"{x + 5}°", f"{abs(90 - 2 * x) + 1}°"], [f"Complementary angles add up to 90°.", f"Complement = 90 − {x} = {90 - x}°."]
        return f"What is the supplement of an angle of {x}°?", f"{180 - x}°", [f"{90 - x}°", f"{180 - x + 10}°", f"{x + 90}°", f"{360 - x}°"], [f"Supplementary angles add up to 180°.", f"Supplement = 180 − {x} = {180 - x}°."]
    a, b, c = rng.choice([(3, 4, 5), (6, 8, 10), (5, 12, 13), (9, 12, 15), (8, 15, 17), (12, 16, 20), (7, 24, 25), (15, 20, 25), (20, 21, 29), (9, 40, 41)])
    return f"The two sides containing the right angle of a right-angled triangle are {a} cm and {b} cm. Find the hypotenuse.", f"{c} cm", [f"{a + b} cm", f"{c + 1} cm", f"{c - 2} cm", f"{b + 2} cm"], [f"Hypotenuse = √({a}² + {b}²) = √{a * a + b * b}.", f"= {c} cm."]


@maths("statistics")
def stats():
    kind = rng.choice(["mean", "median", "mode", "range"])
    if kind == "mean":
        n = rng.choice([5, 6, 7, 8])
        while True:
            xs = [rng.randint(5, 60) for _ in range(n)]
            if sum(xs) % n == 0: break
        m = sum(xs) // n
        return f"Find the mean of {', '.join(map(str, xs))}.", str(m), [str(m + 2), str(m - 1), str(sorted(xs)[n // 2]), str(m + 5)], [f"Sum = {sum(xs)}, number of values = {n}.", f"Mean = {sum(xs)}/{n} = {m}."]
    if kind == "median":
        n = rng.choice([7, 9])
        xs = rng.sample(range(10, 90), n)
        med = sorted(xs)[n // 2]
        return f"Find the median of {', '.join(map(str, xs))}.", str(med), [str(sorted(xs)[n // 2 - 1]), str(sorted(xs)[n // 2 + 1]), str(round(sum(xs) / n)) if round(sum(xs) / n) != med else str(med + 3), str(xs[n // 2]) if xs[n // 2] != med else str(med - 4)], [f"Arranged in order: {', '.join(map(str, sorted(xs)))}.", f"The middle ({ordn(n // 2 + 1)}) value = {med}."]
    if kind == "mode":
        base = rng.sample(range(2, 30), 5)
        md = base[0]
        xs = base + [md, md, base[1]]
        rng.shuffle(xs)
        return f"Find the mode of {', '.join(map(str, xs))}.", str(md), [str(base[1]), str(base[2]), str(base[3]), str(max(xs))], [f"{md} appears 3 times, more than any other value.", f"Mode = {md}."]
    xs = rng.sample(range(5, 120), 7)
    r = max(xs) - min(xs)
    return f"Find the range of {', '.join(map(str, xs))}.", str(r), [str(max(xs)), str(r + 5), str(sum(xs) // 7), str(r - 3)], [f"Range = largest − smallest = {max(xs)} − {min(xs)}.", f"= {r}."]


@maths("simplification")
def simplify():
    kind = rng.choice(["bodmas", "sqrt", "bodmas2"])
    if kind == "sqrt":
        a = rng.randint(13, 99)
        n = a * a
        return f"Find the value of √{ind(n)}.", str(a), [str(a + 1), str(a - 1), str(a + 2), str(a + 10)], [f"{a} × {a} = {ind(n)}.", f"So √{ind(n)} = {a}."]
    if kind == "bodmas":
        b, c, e = rng.randint(2, 12), rng.randint(2, 12), rng.randint(2, 9)
        dd = e * rng.randint(2, 12)
        a = rng.randint(5, 60)
        v = a + b * c - dd // e
        wrong = (a + b) * c - dd // e
        return f"Simplify: {a} + {b} × {c} − {dd} ÷ {e}", str(v), [str(wrong), str(v + e), str(a + b * c - dd), str(v - 2)], [f"Do ÷ and × first: {b} × {c} = {b * c}, {dd} ÷ {e} = {dd // e}.", f"{a} + {b * c} − {dd // e} = {v}."]
    a, b, c = rng.randint(10, 40), rng.randint(2, 9), rng.randint(2, 9)
    v = a - b * (c + 3) // 1
    return f"Simplify: {a} − {b} × ({c} + 3)", str(v), [str((a - b) * (c + 3)), str(a - b * c + 3), str(v + b), str(v - 3)], [f"Bracket first: {c} + 3 = {c + 3}; then {b} × {c + 3} = {b * (c + 3)}.", f"{a} − {b * (c + 3)} = {v}."]


@maths("fractions")
def fractions_q():
    kind = rng.choice(["largest", "of", "add"])
    if kind == "largest":
        while True:
            fs = list({Fraction(rng.randint(1, 11), rng.randint(2, 13)) for _ in range(4)})
            if len(fs) == 4 and all(f < 1 for f in fs): break
        big = max(fs)
        s = lambda f: f"{f.numerator}/{f.denominator}"
        return f"Which is the largest of {', '.join(s(f) for f in fs)}?", s(big), [s(f) for f in fs if f != big], [f"In decimals: " + ", ".join(f"{s(f)} = {float(f):.3f}" for f in fs) + ".", f"The largest is {s(big)}."]
    if kind == "of":
        while True:
            a, b, c, d_ = rng.randint(1, 5), rng.randint(2, 7), rng.randint(1, 5), rng.randint(2, 7)
            if a < b and c < d_:
                n = b * d_ * rng.randint(2, 20)
                v = Fraction(a, b) * Fraction(c, d_) * n
                if v.denominator == 1: break
        return f"Find {a}/{b} of {c}/{d_} of {n}.", num(v), [num(v * 2), num(v + c), num(Fraction(a, b) * n), num(v - 1)], [f"{a}/{b} × {c}/{d_} × {n}.", f"= {num(v)}."]
    while True:
        p, q = Fraction(rng.randint(1, 7), rng.randint(2, 9)), Fraction(rng.randint(1, 7), rng.randint(2, 9))
        if p.denominator != q.denominator: break
    v = p + q
    s = lambda f: f"{f.numerator}/{f.denominator}" if f.denominator != 1 else str(f.numerator)
    wrong = Fraction(p.numerator + q.numerator, p.denominator + q.denominator)
    return f"Find the value of {s(p)} + {s(q)}.", s(v), [s(wrong), s(v + Fraction(1, v.denominator)), s(p * q), s(v - Fraction(1, v.denominator))], [f"LCM of {p.denominator} and {q.denominator} = {math.lcm(p.denominator, q.denominator)}.", f"{s(p)} + {s(q)} = {s(v)}."]


@maths("power-exponents")
def powers():
    kind = rng.choice(["solve", "laws", "value"])
    if kind == "solve":
        b = rng.choice([2, 3, 5, 7, 4, 6])
        x = rng.randint(2, 7 if b > 3 else 10)
        if b ** x > 200000: x = 4
        return f"If {b}ˣ = {ind(b ** x)}, find the value of x.", str(x), [str(x + 1), str(x - 1), str(x + 2), str(b ** x // b)], [f"{ind(b ** x)} = {b}{sup(x)}.", f"So x = {x}."]
    if kind == "laws":
        a = rng.choice([2, 3, 5, 10])
        m, n, k = rng.randint(3, 9), rng.randint(2, 8), rng.randint(2, 8)
        e = m + n - k
        return f"Simplify: ({a}{sup(m)} × {a}{sup(n)}) ÷ {a}{sup(k)}", f"{a}{sup(e)}", [f"{a}{sup(m * n - k)}", f"{a}{sup(m + n + k)}", f"{a}{sup(e + 1)}", f"{a}{sup(m * n // k if m * n // k != e else e + 2)}"], [f"aᵐ × aⁿ = aᵐ⁺ⁿ and aᵐ ÷ aⁿ = aᵐ⁻ⁿ.", f"Power = {m} + {n} − {k} = {e}, so the answer is {a}{sup(e)}."]
    a = rng.choice([2, 3, 4, 5])
    p = rng.randint(2, 5)
    v = a ** p
    return f"What is the value of {a}{sup(p)} + {a}⁰?", str(v + 1), [str(v), str(v + a), str(a * p + 1), str(v - 1)], [f"{a}{sup(p)} = {v} and any non-zero number to the power 0 is 1.", f"{v} + 1 = {v + 1}."]


@maths("decimal")
def decimals():
    kind = rng.choice(["mul", "frac", "add"])
    if kind == "mul":
        a = Fraction(rng.choice([2, 4, 5, 6, 8, 12, 15, 25, 35, 45]), 10 ** rng.choice([1, 2]))
        b = Fraction(rng.choice([2, 3, 4, 5, 6, 8]), 10 ** rng.choice([1, 2]))
        v = a * b
        f = lambda x: ("%.6f" % float(x)).rstrip("0").rstrip(".")
        return f"Find the value of {f(a)} × {f(b)}.", f(v), [f(v * 10), f(v / 10), f(a + b), f(v * 100)], [f"Multiply as whole numbers and count the decimal places.", f"{f(a)} × {f(b)} = {f(v)}."]
    if kind == "frac":
        d_ = rng.choice([4, 5, 8, 16, 20, 25, 40, 2])
        while True:
            n = rng.randint(1, d_ - 1)
            if math.gcd(n, d_) == 1: break
        v = n / d_
        f = lambda x: ("%.6f" % x).rstrip("0").rstrip(".")
        return f"Express {n}/{d_} as a decimal.", f(v), [f(v + 0.1), f(v / 10), f(d_ / n) if d_ / n != v else f(v + 0.05), f(v + 0.01)], [f"Divide {n} by {d_}.", f"{n}/{d_} = {f(v)}."]
    a, b, c = round(rng.uniform(1, 20), 2), round(rng.uniform(1, 9), 1), round(rng.uniform(0.1, 5), 2)
    v = round(a + b - c, 2)
    f = lambda x: ("%.2f" % x).rstrip("0").rstrip(".")
    return f"Find the value of {f(a)} + {f(b)} − {f(c)}.", f(v), [f(v + 1), f(round(a + b + c, 2)), f(v - 0.1), f(v + 0.01)], [f"{f(a)} + {f(b)} = {f(round(a + b, 2))}.", f"{f(round(a + b, 2))} − {f(c)} = {f(v)}."]


# ------------------------------------------------------------------ REASONING
R = []


def reasoning(slug):
    def deco(f):
        R.append((slug, f)); return f
    return deco


A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


@reasoning("r-number-series")
def num_series():
    kind = rng.choice(["ap", "gp", "sq", "cube", "sq1", "diff", "x2p1", "alt"])
    if kind == "ap":
        a, d = rng.randint(2, 40), rng.randint(3, 15); s = [a + i * d for i in range(6)]; why = f"Each term increases by {d}."
    elif kind == "gp":
        a, r = rng.randint(2, 7), rng.choice([2, 3]); s = [a * r ** i for i in range(6)]; why = f"Each term is multiplied by {r}."
    elif kind == "sq":
        k = rng.randint(2, 9); s = [(k + i) ** 2 for i in range(6)]; why = f"The terms are squares: {k}², {k + 1}², {k + 2}², …"
    elif kind == "cube":
        k = rng.randint(1, 5); s = [(k + i) ** 3 for i in range(6)]; why = f"The terms are cubes: {k}³, {k + 1}³, {k + 2}³, …"
    elif kind == "sq1":
        k = rng.randint(1, 8); s = [(k + i) ** 2 + 1 for i in range(6)]; why = f"The terms are n² + 1 for n = {k}, {k + 1}, {k + 2}, …"
    elif kind == "diff":
        a, d = rng.randint(2, 20), rng.choice([1, 2, 3]); s = [a]
        for i in range(1, 6): s.append(s[-1] + d * i * 2)
        why = f"The differences increase by {2 * d}: +{2 * d}, +{4 * d}, +{6 * d}, …"
    elif kind == "x2p1":
        a = rng.randint(1, 6); s = [a]
        for _ in range(5): s.append(s[-1] * 2 + 1)
        why = "Each term = previous term × 2 + 1."
    else:
        a, b, d1, d2 = rng.randint(1, 20), rng.randint(30, 60), rng.randint(2, 6), rng.randint(2, 6)
        s = [a, b, a + d1, b - d2, a + 2 * d1, b - 2 * d2]; why = f"Two series alternate: {a}, {a + d1}, {a + 2 * d1} (+{d1}) and {b}, {b - d2}, {b - 2 * d2} (−{d2})."
    ans = s[-1]
    d = [str(x) for x in near_ints(ans, (1, 2, -1, 3, -2, 5)) if x != ans]
    return f"Find the next term: {', '.join(map(str, s[:-1]))}, ?", str(ans), d, [why, f"So the next term is {ans}."]


@reasoning("r-alphabetical-series")
def alpha_series():
    kind = rng.choice(["skip", "pairs", "pos", "rev"])
    if kind == "skip":
        st, k = rng.randint(0, 8), rng.randint(2, 4)
        seq = [A[st + i * k] for i in range(5)]
        if st + 5 * k > 25: k, st = 2, 0; seq = [A[i * 2] for i in range(5)]
        ans = A[st + 5 * k] if st + 5 * k < 26 else A[(st + 5 * k) % 26]
        d = [A[(A.index(ans) + x) % 26] for x in (1, -1, 2, 3)]
        return f"Find the next letter: {', '.join(seq)}, ?", ans, d, [f"Each letter moves {k} places forward.", f"So the next letter is {ans}."]
    if kind == "pairs":
        st = rng.randint(0, 8)
        seq = [A[st + i] + A[25 - st - i] for i in range(4)]
        ans = A[st + 4] + A[21 - st]
        d = [A[st + 4] + A[22 - st], A[st + 5] + A[21 - st], A[25 - st - 4] + A[st + 4], A[st + 3] + A[20 - st]]
        return f"Find the next term: {', '.join(seq)}, ?", ans, d, [f"The first letters move forward (+1) and the second letters move backward (−1).", f"So the next term is {ans}."]
    if kind == "pos":
        n, m = rng.randint(5, 18), rng.randint(3, 7)
        side = rng.choice(["right", "left"])
        if side == "right":
            p = n + m
            q = f"In the English alphabet, which letter is {ordn(m)} to the right of the {ordn(n)} letter from the left?"
        else:
            p = n - m if n - m >= 1 else n + m
            side = "left" if n - m >= 1 else "right"
            q = f"In the English alphabet, which letter is {ordn(m)} to the {side} of the {ordn(n)} letter from the left?"
        ans = A[p - 1]
        d = [A[(p) % 26], A[(p - 2) % 26], A[(n - 1)], A[(p + 1) % 26]]
        return q, ans, d, [f"The {ordn(n)} letter from the left is {A[n - 1]}.", f"{m} places to the {side} gives the {ordn(p)} letter = {ans}."]
    n = rng.randint(3, 20)
    ans = A[26 - n]
    d = [A[n - 1], A[(26 - n + 1) % 26], A[(26 - n - 1) % 26], A[(26 - n + 2) % 26]]
    return f"If the English alphabet is written in reverse order, which letter will be {ordn(n)} from the left?", ans, d, [f"In reverse order, the {ordn(n)} letter from the left is the {ordn(n)} letter from the right of the normal order.", f"That is the {ordn(27 - n)} letter = {ans}."]


WORDS4 = ["BOOK", "TREE", "RAIN", "GOLD", "LAMP", "FISH", "MILK", "DOOR", "SAND", "WIND", "ROAD", "SHIP", "BIRD", "STAR", "HILL", "COLD", "RICE", "BELL", "FARM", "KING", "LION", "ROSE", "SALT", "TIME", "WOLF", "DUST", "MOON", "PARK", "SNOW", "TEAM"]
WORDS5 = ["PAPER", "WATER", "PLANT", "TRAIN", "CHAIR", "CLOUD", "RIVER", "SMILE", "STONE", "TIGER", "APPLE", "HOUSE", "MONEY", "LIGHT", "BREAD", "GLASS", "TABLE", "QUEEN", "MANGO", "NURSE"]


def shift(w, k): return "".join(A[(A.index(c) + k) % 26] for c in w)


@reasoning("r-coding-decoding")
def coding():
    kind = rng.choice(["shift", "shift", "rev", "sum", "opp"])
    if kind == "shift":
        k = rng.choice([1, 2, 3, -1, -2])
        w1, w2 = rng.sample(WORDS5 + WORDS4, 2)
        ans = shift(w2, k)
        d = [shift(w2, k + 1), shift(w2, -k), shift(w2, k)[::-1] if shift(w2, k)[::-1] != ans else shift(w2, k + 2), shift(w2, k - 1) if k - 1 != 0 else shift(w2, 2)]
        return f"In a certain code, {w1} is written as {shift(w1, k)}. How is {w2} written in that code?", ans, d, [f"Each letter of {w1} moves {abs(k)} place{'s' if abs(k) > 1 else ''} {'forward' if k > 0 else 'backward'}.", f"Doing the same with {w2} gives {ans}."]
    if kind == "rev":
        w1, w2 = rng.sample(WORDS5 + WORDS4, 2)
        ans = w2[::-1]
        d = [shift(w2, 1), w2[1:] + w2[0], w2[-1] + w2[1:-1] + w2[0], shift(w2[::-1], 1)]
        return f"In a certain code, {w1} is written as {w1[::-1]}. How is {w2} written in that code?", ans, d, [f"The letters of {w1} are written in reverse order.", f"So {w2} is written as {ans}."]
    if kind == "opp":
        opp = lambda w: "".join(A[25 - A.index(c)] for c in w)
        w1, w2 = rng.sample(WORDS4 + WORDS5, 2)
        ans = opp(w2)
        d = [shift(w2, 1), opp(w2)[::-1] if opp(w2)[::-1] != ans else shift(ans, 1), shift(ans, 1), shift(ans, -1)]
        return f"In a certain code, {w1} is written as {opp(w1)}. How is {w2} written in that code?", ans, d, [f"Each letter is replaced by its opposite letter (A↔Z, B↔Y, C↔X, …).", f"So {w2} is written as {ans}."]
    w1, w2 = rng.sample(WORDS4 + ["CAT", "DOG", "PEN", "SUN", "BAT", "CUP", "EGG", "HAT"], 2)
    v = lambda w: sum(A.index(c) + 1 for c in w)
    ans = v(w2)
    d = [str(ans + 1), str(ans - 2), str(ans + 3), str(ans + 5)]
    return f"If {w1} = {v(w1)}, then {w2} = ?", str(ans), d, [f"Each letter takes its position number in the alphabet, and they are added: {w1} = " + " + ".join(str(A.index(c) + 1) for c in w1) + f" = {v(w1)}.", f"{w2} = " + " + ".join(str(A.index(c) + 1) for c in w2) + f" = {ans}."]


NAMES = ["Ravi", "Tenzing", "Yamang", "Tana", "Nima", "Pema", "Kago", "Rina", "Biri", "Sonam", "Doli", "Tamo", "Yarin", "Mohan", "Anu", "Kiran"]
DIRS = ["North", "East", "South", "West"]


@reasoning("r-direction-distance")
def direction():
    a, b, c = rng.choice([(3, 4, 5), (6, 8, 10), (5, 12, 13), (9, 12, 15), (8, 15, 17), (12, 16, 20), (15, 20, 25), (7, 24, 25)])
    unit = rng.choice(["km", "m"])
    who = rng.choice(NAMES)
    start = rng.randint(0, 3)
    turn = rng.choice(["right", "left"])
    d1 = DIRS[start]; d2 = DIRS[(start + (1 if turn == "right" else 3)) % 4]
    combo = {frozenset([d1, d2])}
    pair = sorted([d1, d2], key=lambda x: ["North", "South", "East", "West"].index(x))
    final = pair[0] + "-" + pair[1]
    if rng.random() < 0.55:
        dd = [f"{a + b} {unit}", f"{c + 2} {unit}", f"{abs(b - a)} {unit}", f"{c + 5} {unit}"]
        return f"{who} walks {a} {unit} towards the {d1}, then turns {turn} and walks {b} {unit}. How far is {who} from the starting point?", f"{c} {unit}", dd, [f"The two paths are at right angles.", f"Distance = √({a}² + {b}²) = {c} {unit}."]
    opp = {"North-East": "South-West", "North-West": "South-East", "South-East": "North-West", "South-West": "North-East"}
    alln = ["North-East", "North-West", "South-East", "South-West"]
    dd = [x for x in alln if x != final]
    return f"{who} walks {a} {unit} towards the {d1}, then turns {turn} and walks {b} {unit}. In which direction is {who} now from the starting point?", final, dd, [f"{who} goes {d1} and then {d2}.", f"So {who} is to the {final} of the starting point."]


REL = [
    ("{a} is the brother of {b}. {b} is the son of {c}. How is {a} related to {c}?", "Son", ["Brother", "Nephew", "Father"]),
    ("{a} is the sister of {b}. {b} is the daughter of {c}. How is {a} related to {c}?", "Daughter", ["Sister", "Niece", "Mother"]),
    ("{a} is the father of {b}. {b} is the father of {c}. How is {a} related to {c}?", "Grandfather", ["Father", "Uncle", "Brother"]),
    ("{a} is the mother of {b}. {b} is the sister of {c}. How is {a} related to {c}?", "Mother", ["Aunt", "Sister", "Grandmother"]),
    ("{a} is the son of {b}. {b} is the wife of {c}. How is {a} related to {c}?", "Son", ["Nephew", "Brother", "Grandson"]),
    ("{a} is the daughter of {b}. {b} is the brother of {c}. How is {a} related to {c}?", "Niece", ["Daughter", "Sister", "Cousin"]),
    ("{a} is the son of {b}. {b} is the sister of {c}. How is {a} related to {c}?", "Nephew", ["Son", "Brother", "Cousin"]),
    ("{a} is the wife of {b}. {b} is the son of {c}. How is {a} related to {c}?", "Daughter-in-law", ["Daughter", "Sister", "Niece"]),
    ("{a} is the husband of {b}. {b} is the daughter of {c}. How is {a} related to {c}?", "Son-in-law", ["Son", "Brother", "Nephew"]),
    ("{a} is the brother of {b}. {b} is the mother of {c}. How is {a} related to {c}?", "Maternal uncle", ["Father", "Brother", "Grandfather"]),
    ("{a} is the sister of {b}. {b} is the father of {c}. How is {a} related to {c}?", "Aunt", ["Mother", "Sister", "Grandmother"]),
    ("{a} is the father of {b}. {b} is the mother of {c}. How is {a} related to {c}?", "Grandfather", ["Father", "Uncle", "Brother-in-law"]),
    ("Pointing to a man, {f} said, \"He is the son of my father's only son.\" How is the man related to {f}?", "Nephew", ["Son", "Brother", "Cousin"]),
    ("Pointing to a girl, {m} said, \"She is the daughter of my paternal grandfather's only son.\" How is the girl related to {m}?", "Sister", ["Cousin", "Niece", "Daughter"]),
    ("Pointing to a photograph, {m} said, \"His mother is the only daughter of my mother.\" How is {m} related to the person in the photograph?", "Maternal uncle", ["Father", "Brother", "Cousin"]),
    ("{a} is the mother of {b}. {b} is the wife of {c}. How is {a} related to {c}?", "Mother-in-law", ["Mother", "Aunt", "Sister-in-law"]),
]
FEMALE = ["Rina", "Doli", "Anu", "Pema", "Tamo"]
MALE = ["Ravi", "Tenzing", "Nima", "Kago", "Mohan", "Yarin"]


@reasoning("r-blood-relation")
def blood():
    tpl, ans, wrong = rng.choice(REL)
    names = rng.sample(["P", "Q", "R", "X", "Y", "Z", "M", "N", "A", "B", "C", "D"], 3)
    q = tpl.format(a=names[0], b=names[1], c=names[2], f=rng.choice(FEMALE), m=rng.choice(MALE))
    return q, ans, wrong + ["Cousin", "Uncle"], [f"Follow the relations one step at a time from the person asked about.", f"The relation is: {ans}."]


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


@reasoning("r-calendar")
def calendar():
    if rng.random() < 0.5:
        s = rng.randint(0, 6); n = rng.randint(20, 200)
        ans = DAYS[(s + n) % 7]
        d = [DAYS[(s + n + k) % 7] for k in (1, -1, 2, 3)]
        return f"If today is {DAYS[s]}, what day of the week will it be after {n} days?", ans, d, [f"{n} days = {n // 7} weeks and {n % 7} odd day{'s' if n % 7 != 1 else ''}.", f"{DAYS[s]} + {n % 7} day{'s' if n % 7 != 1 else ''} = {ans}."]
    y = rng.choice([2025, 2026, 2027])
    d1 = datetime.date(y, rng.randint(1, 6), rng.randint(1, 28))
    d2 = d1 + datetime.timedelta(days=rng.randint(30, 150))
    w1, w2 = DAYS[d1.weekday()], DAYS[d2.weekday()]
    gap = (d2 - d1).days
    f = lambda d: f"{d.day} {d.strftime('%B')} {d.year}"
    dd = [DAYS[(d2.weekday() + k) % 7] for k in (1, -1, 2, 3)]
    return f"If {f(d1)} is a {w1}, what day of the week is {f(d2)}?", w2, dd, [f"Number of days from {f(d1)} to {f(d2)} = {gap}, which gives {gap % 7} odd day{'s' if gap % 7 != 1 else ''}.", f"{w1} + {gap % 7} = {w2}."]


@reasoning("r-clock")
def clock():
    while True:
        h, m = rng.randint(1, 11), rng.choice(range(0, 60, 2))
        ang = abs(30 * h - 5.5 * m)
        if ang > 180: ang = 360 - ang
        if ang == int(ang) and 0 < ang < 180: break
    ang = int(ang)
    d = [f"{ang + 10}°", f"{abs(ang - 15) if abs(ang - 15) != ang else ang + 20}°", f"{180 - ang if 180 - ang != ang else ang + 5}°", f"{ang + 30}°"]
    return f"What is the angle between the hour hand and the minute hand of a clock at {h}:{m:02d}?", f"{ang}°", d, [f"Angle = |30H − 5.5M| = |30 × {h} − 5.5 × {m}|.", f"= {ang}°."]


@reasoning("r-ranking-seating")
def ranking():
    who = rng.choice(NAMES)
    if rng.random() < 0.5:
        l, r = rng.randint(5, 30), rng.randint(5, 30)
        n = l + r - 1
        return f"In a row of students, {who} is {ordn(l)} from the left and {ordn(r)} from the right. How many students are there in the row?", str(n), [str(n + 1), str(n - 1), str(n + 2), str(l + r + 1)], [f"Total = position from left + position from right − 1.", f"= {l} + {r} − 1 = {n}."]
    n, t = rng.randint(30, 60), rng.randint(5, 25)
    b = n - t + 1
    return f"In a class of {n} students, {who} is {ordn(t)} from the top. What is {who}'s position from the bottom?", ordn(b), [ordn(b + 1), ordn(b - 1), ordn(b + 2), ordn(b - 2), ordn(t)], [f"Position from bottom = total − position from top + 1.", f"= {n} − {t} + 1 = {b}."]


@reasoning("r-analogy")
def analogy():
    kind = rng.choice(["sq", "cube", "sq1", "cube1", "letter"])
    if kind == "letter":
        k = rng.randint(1, 4)
        s1, s2 = rng.sample(range(0, 20), 2)
        p1 = A[s1] + A[s1 + 1]; q1 = shift(p1, k)
        p2 = A[s2] + A[s2 + 1]; ans = shift(p2, k)
        return f"{p1} : {q1} :: {p2} : ?", ans, [shift(p2, k + 1), shift(p2, k - 1) if k > 1 else shift(p2, 5), shift(p2, -k), ans[::-1]], [f"Each letter of {p1} moves {k} place{'s' if k > 1 else ''} forward to give {q1}.", f"So {p2} becomes {ans}."]
    f = {"sq": lambda x: x * x, "cube": lambda x: x ** 3, "sq1": lambda x: x * x + 1, "cube1": lambda x: x ** 3 + 1}[kind]
    why = {"sq": "n : n²", "cube": "n : n³", "sq1": "n : n² + 1", "cube1": "n : n³ + 1"}[kind]
    a, b = rng.sample(range(2, 13 if kind in ("sq", "sq1") else 8), 2)
    ans = f(b)
    return f"{a} : {f(a)} :: {b} : ?", str(ans), [str(ans + 1), str(ans - 1), str(ans + b), str(ans * 2)], [f"The relation is {why}: {a} → {f(a)}.", f"So {b} → {ans}."]


@reasoning("r-classification")
def odd_one():
    kind = rng.choice(["prime", "square", "mult", "letters", "even"])
    if kind == "prime":
        ps = rng.sample([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73], 3)
        odd = rng.choice([21, 27, 33, 39, 49, 51, 57, 63, 69, 77, 81, 87, 91])
        why = f"All the others are prime numbers; {odd} is not."
    elif kind == "square":
        ps = [x * x for x in rng.sample(range(4, 20), 3)]
        odd = rng.choice([x * x + rng.choice([1, 2, -1]) for x in range(5, 15)])
        why = f"All the others are perfect squares; {odd} is not."
    elif kind == "mult":
        k = rng.choice([6, 7, 8, 9, 11, 12, 13])
        ps = [k * x for x in rng.sample(range(3, 12), 3)]
        odd = k * rng.randint(3, 12) + rng.choice([1, 2, 3])
        why = f"All the others are multiples of {k}; {odd} is not."
    elif kind == "even":
        ps = [2 * x for x in rng.sample(range(10, 60), 3)]
        odd = 2 * rng.randint(10, 60) + 1
        why = f"All the others are even numbers; {odd} is odd."
    else:
        gs = []
        for _ in range(3):
            s = rng.randint(0, 19); gs.append(A[s] + A[s + 2] + A[s + 4])
        s = rng.randint(0, 19); odd = A[s] + A[s + 2] + A[s + 5]
        ps = gs
        why = f"In the others, each letter moves 2 places forward; in {odd} the gap changes."
        return "Find the odd one out:", odd, ps + [A[s] + A[s + 1] + A[s + 3]], [why, f"So {odd} is the odd one out."]
    items = [str(x) for x in ps]
    return "Find the odd one out:", str(odd), items + [str(odd + 100)], [why, f"So {odd} is the odd one out."]


DICT_WORDS = ["Garden", "Garland", "Gamble", "Gather", "Gallery", "Market", "Marble", "Master", "Matter", "Margin", "Planet", "Plastic", "Player", "Pledge", "Plenty",
              "Stamp", "Stand", "Staple", "Starve", "Statue", "Bright", "Bridge", "Bridle", "Brief", "Brick", "Cradle", "Crane", "Crater", "Crayon", "Crazy"]


@reasoning("r-word-formation")
def dictionary():
    while True:
        grp = rng.choice([DICT_WORDS[i:i + 5] for i in range(0, 30, 5)])
        ws = rng.sample(grp, 4)
        if len(set(ws)) == 4: break
    order = sorted(range(4), key=lambda i: ws[i])
    ans = ", ".join(str(i + 1) for i in order)
    wrong = []
    while len(wrong) < 4:
        p = rng.sample(range(4), 4)
        s = ", ".join(str(i + 1) for i in p)
        if s != ans and s not in wrong: wrong.append(s)
    listing = "  ".join(f"{i + 1}. {w}" for i, w in enumerate(ws))
    return f"Arrange the following words in dictionary order: {listing}", ans, wrong, [f"In dictionary order: " + ", ".join(ws[i] for i in order) + ".", f"So the order is {ans}."]


@reasoning("r-cube-cuboid")
def cube_paint():
    n = rng.randint(3, 7)
    kind = rng.choice(["three", "two", "one", "none"])
    v = {"three": 8, "two": 12 * (n - 2), "one": 6 * (n - 2) ** 2, "none": (n - 2) ** 3}[kind]
    label = {"three": "exactly three faces painted", "two": "exactly two faces painted", "one": "exactly one face painted", "none": "no face painted"}[kind]
    formula = {"three": "Cubes with three painted faces are the 8 corners.", "two": f"Two faces painted = 12(n − 2) = 12 × {n - 2}.", "one": f"One face painted = 6(n − 2)² = 6 × {(n - 2) ** 2}.", "none": f"No face painted = (n − 2)³ = {n - 2}³."}[kind]
    others = [8, 12 * (n - 2), 6 * (n - 2) ** 2, (n - 2) ** 3, n ** 3, 6 * n, n * n, v + 4, v * 2, 4 * (n - 2), 12]
    d = [str(x) for x in others if x != v]
    return f"A cube painted red on all faces is cut into {n ** 3} equal smaller cubes. How many smaller cubes have {label}?", str(v), d, [f"The cube is cut {n} × {n} × {n}, so n = {n}.", formula + f" = {v}."]


# ------------------------------------------------------------------ build the sets
def make(pool, total):
    per = {}
    out, seen = [], set()
    order = list(range(len(pool)))
    i = 0
    guard = 0
    while len(out) < total:
        slug, f = pool[order[i % len(order)]]
        i += 1
        q, ans, d, steps = f()
        guard += 1
        assert guard < total * 40
        if q in seen: continue
        o, k = opts_from(ans, d)
        seen.add(q)
        out.append({"slug": slug, "t": q, "o": o, "k": k, "s": steps})
    return out


maths_all = make(M, 327)
reasoning_all = make(R, 327)


def split(items):
    mixed, rest = [], []
    # round-robin by topic so each set of 10 is varied
    by = {}
    for x in items: by.setdefault(x["slug"], []).append(x)
    keys = list(by)
    while len(mixed) < 130:
        for k in keys:
            if by[k] and len(mixed) < 130: mixed.append(by[k].pop(0))
    for k in keys: rest.extend(by[k])
    return mixed, rest


mm, mr = split(maths_all)
rm, rr = split(reasoning_all)
mq = {}
for x in mr + rr:
    mq.setdefault(x["slug"], []).append({k: x[k] for k in ("t", "o", "k", "s")})
json.dump({"maths_mixed": mm, "reasoning_mixed": rm, "mq": mq}, open("new_questions.json", "w"), ensure_ascii=False, indent=0)
print("maths", len(maths_all), "reasoning", len(reasoning_all), "| mixed", len(mm), len(rm), "| mock-only", sum(len(v) for v in mq.values()))
for x in (mm[:3] + rm[:4]):
    print("-", x["slug"], "|", x["t"], "|", x["o"], "key", "ABCD"[x["k"]], "|", " ".join(x["s"]))
