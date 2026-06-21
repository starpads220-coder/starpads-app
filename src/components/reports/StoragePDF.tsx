import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles } from "./PDFStyles";

interface StockItem {
  packSize: string;
  quantity: number;
  pads: number;
}

interface ActivityItem {
  date: string;
  type: "in" | "out";
  label: string;
  value: number;
}

interface StoragePDFProps {
  title: string;
  period: string;
  stockBySize: StockItem[];
  totalPads: number;
  stockInTotal: number;
  stockOutTotal: number;
  activeBatch: string;
  batchCompletionPct: number;
  daysOfStock: number | string;
  recentActivity: ActivityItem[];
}

export function StoragePDF({
  title, period, stockBySize, totalPads, stockInTotal, stockOutTotal,
  activeBatch, batchCompletionPct, daysOfStock, recentActivity,
}: StoragePDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Storage Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Pads in Stock</Text>
            <Text style={pdfStyles.summaryValue}>{totalPads.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Stock-In (period)</Text>
            <Text style={pdfStyles.summaryValue}>{stockInTotal.toLocaleString()} pads</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Stock-Out (period)</Text>
            <Text style={pdfStyles.summaryValue}>{stockOutTotal.toLocaleString()} pads</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Active Batch</Text>
            <Text style={pdfStyles.summaryValue}>{activeBatch || "None"}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Batch Completion</Text>
            <Text style={pdfStyles.summaryValue}>{batchCompletionPct}%</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Days of Stock Remaining</Text>
            <Text style={pdfStyles.summaryValue}>{String(daysOfStock)}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Stock by Pack Size</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "40%" }}><Text style={pdfStyles.tableCellHeader}>Pack Size</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "30%" }}><Text style={pdfStyles.tableCellHeader}>Quantity</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "30%" }}><Text style={pdfStyles.tableCellHeader}>Total Pads</Text></View>
            </View>
            {stockBySize.map((s, i) => (
              <View style={pdfStyles.tableRow} key={i}>
                <View style={{ ...pdfStyles.tableCol, width: "40%" }}><Text style={pdfStyles.tableCell}>{s.packSize}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: "30%" }}><Text style={pdfStyles.tableCell}>{s.quantity.toLocaleString()}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: "30%" }}><Text style={pdfStyles.tableCell}>{s.pads.toLocaleString()}</Text></View>
              </View>
            ))}
          </View>
        </View>

        {recentActivity.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Recent Activity</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableColHeader, width: "25%" }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
                <View style={{ ...pdfStyles.tableColHeader, width: "25%" }}><Text style={pdfStyles.tableCellHeader}>Type</Text></View>
                <View style={{ ...pdfStyles.tableColHeader, width: "25%" }}><Text style={pdfStyles.tableCellHeader}>Label</Text></View>
                <View style={{ ...pdfStyles.tableColHeader, width: "25%" }}><Text style={pdfStyles.tableCellHeader}>Pads</Text></View>
              </View>
              {recentActivity.map((a, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: "25%" }}><Text style={pdfStyles.tableCell}>{a.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "25%" }}><Text style={pdfStyles.tableCell}>{a.type === "in" ? "Stock In" : "Stock Out"}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "25%" }}><Text style={pdfStyles.tableCell}>{a.label}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "25%" }}><Text style={pdfStyles.tableCell}>{a.value.toLocaleString()}</Text></View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={pdfStyles.signature}>
          <Text style={pdfStyles.signatureLine}>Authorised Signature</Text>
        </View>

        <Text style={pdfStyles.footer} fixed>
          Generated on {new Date().toLocaleString()} &mdash; Page 1
        </Text>
      </Page>
    </Document>
  );
}
