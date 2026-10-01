"""Regenerate the five fictional source files used by the live demo."""

from pathlib import Path

import pymupdf as fitz


OUT = Path(__file__).resolve().parents[1] / "demo_sources"
OUT.mkdir(parents=True, exist_ok=True)


def add_page(title: str, paragraphs: list[tuple[str, str]]) -> fitz.Page:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.draw_rect(fitz.Rect(0, 0, 612, 11), color=None, fill=(0.20, 0.29, 0.57))
    page.insert_text((52, 54), "NORTHSTAR COMMERCE  /  PRODUCT & RISK", fontsize=8, color=(0.40, 0.45, 0.52))
    page.insert_textbox(fitz.Rect(52, 78, 560, 128), title, fontsize=22, fontname="hebo", color=(0.12, 0.17, 0.23))
    y = 154
    for heading, body in paragraphs:
        page.insert_text((52, y), heading, fontsize=12, fontname="hebo", color=(0.23, 0.31, 0.47))
        y += 15
        page.insert_textbox(fitz.Rect(52, y, 553, y + 92), body, fontsize=10, fontname="helv", lineheight=1.35, color=(0.27, 0.32, 0.37))
        y += 106
    page.insert_text((52, 760), "INTERNAL WORKING DOCUMENT  ·  CHECKOUT REVAMP", fontsize=7, color=(0.55, 0.59, 0.63))
    return page


def create_product_pdf() -> None:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.draw_rect(fitz.Rect(0, 0, 612, 11), color=None, fill=(0.20, 0.29, 0.57))
    page.insert_text((52, 54), "NORTHSTAR COMMERCE  /  PRODUCT", fontsize=8, color=(0.40, 0.45, 0.52))
    page.insert_textbox(fitz.Rect(52, 78, 560, 134), "Checkout modernization\nProduct requirements", fontsize=22, fontname="hebo", color=(0.12, 0.17, 0.23), lineheight=1.2)
    page.insert_text((52, 158), "Revision 1.4  ·  Product working draft  ·  14 August 2026", fontsize=9, color=(0.48, 0.53, 0.58))
    page.insert_text((52, 202), "1. Outcomes", fontsize=13, fontname="hebo", color=(0.23, 0.31, 0.47))
    page.insert_textbox(fitz.Rect(52, 218, 554, 318), "Reduce checkout abandonment for returning customers while keeping guest checkout available. Consolidate contact, delivery, and payment confirmation into a clear review step. The checkout must remain usable on mobile and desktop.", fontsize=10, lineheight=1.4, color=(0.27, 0.32, 0.37))
    page.insert_text((52, 348), "2. Functional requirements", fontsize=13, fontname="hebo", color=(0.23, 0.31, 0.47))
    page.insert_textbox(fitz.Rect(52, 364, 554, 620), "PR-01  A customer can complete checkout as a guest.\n\nPR-02  A returning customer can review the order, delivery address, and payment choice before placing an order.\n\nPR-03  The payment step must support card payment through the hosted payment provider.\n\nPR-04  Show a clear confirmation and an order reference after successful authorization.\n\nPR-05  Preserve the shopping cart when a customer returns to checkout within the same session.", fontsize=10, lineheight=1.4, color=(0.27, 0.32, 0.37))
    page.insert_text((52, 760), "INTERNAL WORKING DOCUMENT  ·  CHECKOUT REVAMP", fontsize=7, color=(0.55, 0.59, 0.63))
    page = document.new_page(width=612, height=792)
    page.draw_rect(fitz.Rect(0, 0, 612, 11), color=None, fill=(0.20, 0.29, 0.57))
    page.insert_text((52, 54), "NORTHSTAR COMMERCE  /  PRODUCT", fontsize=8, color=(0.40, 0.45, 0.52))
    page.insert_textbox(fitz.Rect(52, 79, 558, 128), "3. Experience & acceptance", fontsize=21, fontname="hebo", color=(0.12, 0.17, 0.23))
    page.insert_textbox(fitz.Rect(52, 154, 554, 366), "PR-06  Show payment method, masked details, total, tax, and delivery estimate together on the final review.\n\nPR-07  Validation errors must identify the affected field and preserve other valid checkout values.\n\nPR-08  Support a screen-reader accessible keyboard flow through delivery, payment, and order placement.\n\nPR-09  The confirmation state must be clear if payment authorization succeeds but order creation needs a retry.", fontsize=10, lineheight=1.5, color=(0.27, 0.32, 0.37))
    page.insert_text((52, 402), "Success measures", fontsize=13, fontname="hebo", color=(0.23, 0.31, 0.47))
    page.insert_textbox(fitz.Rect(52, 420, 554, 548), "• Reduce checkout abandonment by 12% for returning customers.\n• Keep payment authorization errors below the current baseline.\n• Do not regress guest checkout conversion.", fontsize=10, lineheight=1.5, color=(0.27, 0.32, 0.37))
    page.insert_textbox(fitz.Rect(52, 602, 554, 678), "Open product question: which payment details, if any, may be retained to support a faster returning-customer experience? Confirm with Compliance before launch.", fontsize=10, lineheight=1.4, fill=(1.0, 0.97, 0.89), color=(0.48, 0.39, 0.22))
    page.insert_text((52, 760), "INTERNAL WORKING DOCUMENT  ·  CHECKOUT REVAMP", fontsize=7, color=(0.55, 0.59, 0.63))
    document.save(OUT / "product_requirements.pdf")


def create_compliance_pdf() -> None:
    document = fitz.open()
    page = document.new_page(width=612, height=792)
    page.draw_rect(fitz.Rect(0, 0, 612, 11), color=None, fill=(0.57, 0.25, 0.24))
    page.insert_text((52, 54), "NORTHSTAR COMMERCE  /  TRUST & COMPLIANCE", fontsize=8, color=(0.40, 0.45, 0.52))
    page.insert_textbox(fitz.Rect(52, 78, 558, 134), "Payment data handling\nSecurity control standard", fontsize=22, fontname="hebo", color=(0.12, 0.17, 0.23), lineheight=1.2)
    page.insert_text((52, 158), "Control SEC-PAY-04  ·  Revision 3.2  ·  02 July 2026", fontsize=9, color=(0.48, 0.53, 0.58))
    page.insert_text((52, 205), "4.1 Credential retention prohibition", fontsize=13, fontname="hebo", color=(0.56, 0.25, 0.24))
    page.draw_rect(fitz.Rect(49, 218, 558, 334), color=(0.91, 0.76, 0.73), fill=(1.0, 0.95, 0.94), width=1)
    page.insert_textbox(fitz.Rect(64, 232, 543, 321), "Payment credentials must not be persisted by Northstar Commerce after authorization. This prohibition includes primary account number, card verification code, expiry data, and any reusable payment credential or provider token that can initiate a later charge.", fontsize=11, fontname="hebo", lineheight=1.45, color=(0.48, 0.23, 0.22))
    page.insert_text((52, 373), "4.2 Approved payment flow", fontsize=13, fontname="hebo", color=(0.23, 0.31, 0.47))
    page.insert_textbox(fitz.Rect(52, 389, 554, 516), "Collect card credentials in the payment provider's hosted fields. Send them directly to the provider for authorization. The commerce application may retain the provider transaction reference and the masked display brand/last four digits only when the reference cannot be used to initiate a new transaction.", fontsize=10, lineheight=1.45, color=(0.27, 0.32, 0.37))
    page.insert_text((52, 554), "4.3 Release gate", fontsize=13, fontname="hebo", color=(0.23, 0.31, 0.47))
    page.insert_textbox(fitz.Rect(52, 570, 554, 652), "Any feature that asks to remember a payment method requires a documented review by Security and Compliance. No release may store reusable credentials unless this control is formally revised and approved.", fontsize=10, lineheight=1.45, color=(0.27, 0.32, 0.37))
    page.insert_text((52, 760), "INTERNAL CONTROLLED DOCUMENT  ·  PAYMENT SECURITY", fontsize=7, color=(0.55, 0.59, 0.63))
    document.save(OUT / "payment_compliance.pdf")


def create_checkout_screenshot() -> None:
    doc = fitz.open()
    page = doc.new_page(width=1100, height=760)
    page.draw_rect(page.rect, color=None, fill=(0.965, 0.97, 0.98))
    page.draw_rect(fitz.Rect(0, 0, 1100, 66), color=None, fill=(1, 1, 1))
    page.insert_text((55, 43), "NORTHSTAR", fontsize=19, fontname="hebo", color=(0.16, 0.22, 0.31))
    page.insert_text((870, 41), "Help     Account     Bag (2)", fontsize=11, color=(0.36, 0.41, 0.47))
    page.insert_text((66, 121), "Checkout", fontsize=25, fontname="hebo", color=(0.14, 0.19, 0.25))
    page.insert_text((67, 154), "Shipping   /   Payment   /   Review", fontsize=10, color=(0.42, 0.48, 0.55))
    # Left column: delivery form.
    page.draw_rect(fitz.Rect(62, 184, 690, 694), color=(0.89, 0.91, 0.93), fill=(1, 1, 1), width=1)
    page.insert_text((88, 221), "Delivery details", fontsize=15, fontname="hebo", color=(0.19, 0.25, 0.32))
    fields = [(88, 253, 353, 298, "Email address", "alex@example.com"), (369, 253, 662, 298, "Full name", "Alex Morgan"), (88, 316, 662, 361, "Street address", "42 Market Street"), (88, 379, 371, 424, "City", "San Francisco"), (389, 379, 662, 424, "ZIP code", "94105")]
    for x1, y1, x2, y2, label, value in fields:
        page.insert_text((x1, y1 - 5), label, fontsize=8, color=(0.52, 0.57, 0.62))
        page.draw_rect(fitz.Rect(x1, y1, x2, y2), color=(0.85, 0.88, 0.90), fill=(1, 1, 1), width=1)
        page.insert_text((x1 + 11, y1 + 28), value, fontsize=10, color=(0.32, 0.38, 0.44))
    page.insert_text((88, 465), "Payment method", fontsize=15, fontname="hebo", color=(0.19, 0.25, 0.32))
    page.draw_rect(fitz.Rect(88, 485, 662, 545), color=(0.84, 0.87, 0.94), fill=(0.98, 0.985, 1), width=1)
    page.insert_text((107, 521), "◉   Visa ending in 4242", fontsize=11, color=(0.27, 0.34, 0.44))
    page.draw_rect(fitz.Rect(89, 568, 101, 580), color=(0.37, 0.44, 0.55), fill=(1, 1, 1), width=1)
    page.insert_text((112, 578), "Remember this card for next time", fontsize=10, color=(0.27, 0.33, 0.39))
    page.insert_text((89, 606), "Your payment is securely processed by our payment provider.", fontsize=8, color=(0.53, 0.58, 0.63))
    # Right column: order summary.
    page.draw_rect(fitz.Rect(715, 184, 1039, 694), color=(0.89, 0.91, 0.93), fill=(1, 1, 1), width=1)
    page.insert_text((740, 221), "Order summary", fontsize=14, fontname="hebo", color=(0.19, 0.25, 0.32))
    page.draw_rect(fitz.Rect(740, 243, 798, 302), color=None, fill=(0.92, 0.90, 0.85))
    page.insert_text((811, 263), "Everyday Tote", fontsize=9, fontname="hebo", color=(0.30, 0.36, 0.41))
    page.insert_text((811, 281), "Natural canvas · Qty 1", fontsize=8, color=(0.58, 0.62, 0.66))
    page.insert_text((980, 266), "$38.00", fontsize=9, color=(0.30, 0.36, 0.41))
    page.draw_line(fitz.Point(740, 328), fitz.Point(1013, 328), color=(0.91, 0.92, 0.93))
    for y, label, price in [(361, "Subtotal", "$38.00"), (391, "Shipping", "$4.00"), (421, "Estimated tax", "$3.42")]:
        page.insert_text((741, y), label, fontsize=9, color=(0.52, 0.58, 0.63))
        page.insert_text((968, y), price, fontsize=9, color=(0.35, 0.41, 0.46))
    page.draw_line(fitz.Point(740, 444), fitz.Point(1013, 444), color=(0.91, 0.92, 0.93))
    page.insert_text((741, 474), "Total", fontsize=11, fontname="hebo", color=(0.23, 0.29, 0.35))
    page.insert_text((946, 474), "$45.42", fontsize=12, fontname="hebo", color=(0.20, 0.26, 0.32))
    page.draw_rect(fitz.Rect(740, 509, 1014, 554), color=None, fill=(0.24, 0.34, 0.53))
    page.insert_text((827, 538), "Place order", fontsize=10, fontname="hebo", color=(1, 1, 1))
    page.insert_text((740, 586), "By placing your order, you agree to our terms.", fontsize=7, color=(0.58, 0.63, 0.67))
    pix = page.get_pixmap(matrix=fitz.Matrix(1.35, 1.35), alpha=False)
    pix.save(OUT / "checkout_payment_screen.png")


(OUT / "product_meeting_transcript.txt").write_text(
    """Checkout Revamp — Product / Engineering weekly sync\n"""
    """Date: 18 August 2026  |  Recording transcript excerpt\n\n"""
    """Maya (Product): Returning shoppers are abandoning checkout because they re-enter the same details. We should let them save their payment information so next time they can choose the card and finish faster.\n\n"""
    """Leo (Engineering): Do you mean save a card with the processor token, or store the card details in our profile service?\n\n"""
    """Maya (Product): The customer expectation is that we remember the payment method. The UI should include a “Remember this card” choice. Let's confirm the implementation with Compliance, but keep the returning-checkout goal in scope.\n\n"""
    """Priya (Analytics): Returning customers have the highest payment-step abandonment. Guest checkout must remain available; we should not force account creation.\n\n"""
    """Decision log: No decision was made on payment credential retention during this meeting. Follow up with Security and Compliance before implementation.\n""",
    encoding="utf-8",
)
(OUT / "payment_step_analytics.csv").write_text(
    """segment,checkout_sessions,payment_step_abandonment_rate,authorization_success_rate,median_payment_seconds,observation\n"""
    """returning_customer,18420,0.214,0.964,96,"Highest abandonment at payment entry; 31% switch devices between sessions"\n"""
    """guest_customer,22610,0.173,0.951,88,"Guest flow remains an important acquisition path"\n"""
    """mobile,30220,0.238,0.946,111,"Small-screen field validation and keyboard friction"\n"""
    """desktop,10810,0.142,0.972,73,"Lower payment-step abandonment"\n"""
    """provider_timeout,621,0.0,0.0,0,"Timeouts correlate with duplicate order support contacts"\n""",
    encoding="utf-8",
)

create_product_pdf()
create_compliance_pdf()
create_checkout_screenshot()
print(f"Created fictional demo sources in {OUT}")
