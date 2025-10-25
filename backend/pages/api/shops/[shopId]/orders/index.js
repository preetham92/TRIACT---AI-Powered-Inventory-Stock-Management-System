import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import connectDB from "../../../../../lib/db.js";
import Order from "../../../../../models/Order.js";
import Product from "../../../../../models/Product.js";
import Invoice from "../../../../../models/Invoice.js";
import Shop from "../../../../../models/Shop.js";
import Notification from "../../../../../models/Notification.js";
import { authMiddleware } from "../../../../../lib/auth.js";
import mongoose from "mongoose";

async function generateInvoicePDF(order, shop, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    const formatCurrency = (amount) => {
      return `Rs. ${(amount || 0).toFixed(2)}`;
    };

    // Header
    doc.fontSize(20).text(shop.shopName, { align: "center" });
    doc.fontSize(10).text(shop.address || "", { align: "center" });
    doc.moveDown(2);

    // Invoice Title
    doc.fontSize(16).text("INVOICE", { align: "left" });

    const detailsTop = doc.y;
    doc.fontSize(11).text(`Invoice #: ${order._id}`, 50, detailsTop);
    doc.text(`Customer: ${order.customerName}`, 50, detailsTop + 15);

    // Date & Biller Info
    doc.text(
      `Date: ${new Date(order.date).toLocaleString("en-IN")}`,
      300,
      detailsTop,
      { align: "right" }
    );
    doc.text(`Billed by: ${order.billerName}`, 300, detailsTop + 15, {
      align: "right",
    });
    doc.moveDown(3);

    // Table Header
    const tableTop = doc.y;
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text("Item", 50, tableTop);
    doc.text("Quantity", 250, tableTop, { width: 100, align: "right" });
    doc.text("Unit Price", 350, tableTop, { width: 100, align: "right" });
    doc.text("Total", 450, tableTop, { width: 100, align: "right" });
    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Rows
    let y = tableTop + 25;
    doc.font("Helvetica").fontSize(10);
    order.items.forEach((item) => {
      doc.text(item.name, 50, y);
      doc.text(item.quantity.toString(), 250, y, {
        width: 100,
        align: "right",
      });
      doc.text(formatCurrency(item.price), 350, y, {
        width: 100,
        align: "right",
      });
      doc.text(formatCurrency(item.quantity * item.price), 450, y, {
        width: 100,
        align: "right",
      });
      y += 20;
    });

    doc.moveTo(50, y).lineTo(550, y).stroke();
    doc.moveDown();

    // Grand Total
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(
        `Grand Total: Rs. ${(order.total || 0).toFixed(2)}`,
        300,
        doc.y + 10,
        {
          width: 250,
          align: "right",
        }
      );

    doc.end();
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

async function handler(req, res) {
  const { shopId } = req.query;
  if (req.user.shopId !== shopId) {
    return res.status(403).json({ message: "Access denied." });
  }
  await connectDB();

  switch (req.method) {
    case "POST":
      const { customerName, items } = req.body;
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        let total = 0;
        const processedItems = [];
        for (const item of items) {
          const product = await Product.findById(item.productId).session(
            session
          );
          if (!product || product.shopId.toString() !== shopId)
            throw new Error(`Product not found.`);
          if (product.stock < item.quantity)
            throw new Error(`Not enough stock for ${product.name}.`);
          total += product.price * item.quantity;
          processedItems.push({
            productId: item.productId,
            name: product.name,
            quantity: item.quantity,
            price: product.price,
          });
        }

        const order = new Order({
          shopId,
          customerName,
          billerName: req.user.name,
          items: processedItems,
          total,
        });
        const savedOrder = await order.save({ session });
        for (const item of processedItems) {
          const product = await Product.findById(item.productId).session(
            session
          );
          const newStock = product.stock - item.quantity;
          if (
            product.stock > product.lowStockThreshold &&
            newStock <= product.lowStockThreshold
          ) {
            await Notification.create(
              [
                {
                  shopId,
                  message: `${product.name} is low on stock! Only ${newStock} left.`,
                },
              ],
              { session }
            );
          }
          await Product.updateOne(
            { _id: item.productId },
            { $set: { stock: newStock } }
          ).session(session);
        }

        const shop = await Shop.findById(shopId).session(session);
        const invoicesDir = path.join(process.cwd(), "public", "invoices");
        fs.mkdirSync(invoicesDir, { recursive: true });
        const pdfPath = path.join(invoicesDir, `invoice-${savedOrder._id}.pdf`);
        const relativePdfPath = `/invoices/invoice-${savedOrder._id}.pdf`;

        await generateInvoicePDF(savedOrder, shop, pdfPath);

        const invoice = new Invoice({
          shopId,
          orderId: savedOrder._id,
          customerName: savedOrder.customerName,
          billerName: savedOrder.billerName,
          total: savedOrder.total,
          pdfPath: relativePdfPath,
        });
        await invoice.save({ session });

        await session.commitTransaction();
        res.status(201).json({
          message: "Order created successfully",
          order: savedOrder,
          invoice,
        });
      } catch (error) {
        await session.abortTransaction();
        console.error("Create Order Error:", error);
        res
          .status(400)
          .json({ message: error.message || "Failed to create order." });
      } finally {
        session.endSession();
      }
      break;

    case "GET":
      try {
        const orders = await Order.find({ shopId }).sort({ date: -1 });
        res.status(200).json({ orders });
      } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
      }
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default authMiddleware(handler);
