"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, username, remitente, email, destinatario, addressShipping, phone } = ctx.request.body;
    try {
      // retrieve item information
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);
          var precio = Math.round(item.price*100,0);
          const descuento=precio*item.descuento;
          const precioFinal = precio-descuento;

          return {
            price_data: {
              currency: "mxn",
              product_data: {
                name: item.name,
              },
              unit_amount: precioFinal,

            },
            quantity: product.count,
          };
        })
      );

      // create a stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });

      // create the item
      await strapi
        .service("api::order.order")
        .create({ data: { username, remitente, products, email, phone, destinatario, addressShipping, stripeSessionId: session.id } });

      // return the session id
      return { id: session.id };
    } catch (error) {
      ctx.response.status = 500;
      return { error: { message: "There was a problem creating the charge" } };
    }
  },
}));
