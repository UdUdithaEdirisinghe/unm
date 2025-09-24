import { NextResponse } from "next/server";
import { sendOrderEmails } from "../../../lib/mail";

export async function GET() {
  try {
    await sendOrderEmails({
      id: "TEST-1234",
      createdAt: new Date().toISOString(),
      customer: {
        firstName: "Test",
        lastName: "User",
        email: "udithaedirisinghe69@gmail.com",  // <-- change to your Gmail or Yahoo
        address: "123 Test Street",
        city: "Colombo",
      },
      items: [
        { name: "Sample Product", quantity: 1, price: 1000 },
      ],
      subtotal: 1000,
      shipping: 0,
      total: 1000,
      promoCode: null,
      promoDiscount: null,
      freeShipping: true,
      paymentMethod: "COD",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("test-mail failed:", err);
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}