import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles } from "./PDFStyles";

interface SalesEntry {
  date: string;
  customerName: string;
  customerType: string;
  packSize: string;
  quantitySold: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
}

interface CategorySummary {
  label: string;
  value: number;
}

interface SalesPDFProps {
  title: string;
  period: string;
  entries: SalesEntry[];
  totalRevenue: number;
  totalTransactions: number;
  totalQuantity: number;
  byCustomerType: CategorySummary[];
  byPaymentMethod: CategorySummary[];
}

export function SalesPDF({
  title, period, entries, totalRevenue, totalTransactions, totalQuantity,
  byCustomerType, byPaymentMethod,
}: SalesPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Sales Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Revenue</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalRevenue.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Transactions</Text>
            <Text style={pdfStyles.summaryValue}>{totalTransactions.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Quantity Sold</Text>
            <Text style={pdfStyles.summaryValue}>{totalQuantity.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Avg Transaction Value</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions).toLocaleString() : "0"}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Sales by Customer Type</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "50%" }}><Text style={pdfStyles.tableCellHeader}>Customer Type</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "50%" }}><Text style={pdfStyles.tableCellHeader}>Revenue (UGX)</Text></View>
            </View>
            {byCustomerType.map((c, i) => (
              <View style={pdfStyles.tableRow} key={i}>
                <View style={{ ...pdfStyles.tableCol, width: "50%" }}><Text style={pdfStyles.tableCell}>{c.label}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: "50%" }}><Text style={pdfStyles.tableCell}>{c.value.toLocaleString()}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Sales by Payment Method</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "50%" }}><Text style={pdfStyles.tableCellHeader}>Payment Method</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "50%" }}><Text style={pdfStyles.tableCellHeader}>Revenue (UGX)</Text></View>
            </View>
            {byPaymentMethod.map((p, i) => (
              <View style={pdfStyles.tableRow} key={i}>
                <View style={{ ...pdfStyles.tableCol, width: "50%" }}><Text style={pdfStyles.tableCell}>{p.label}</Text></View>
                <View style={{ ...pdfStyles.tableCol, width: "50%" }}><Text style={pdfStyles.tableCell}>{p.value.toLocaleString()}</Text></View>
              </View>
            ))}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Transaction Details</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "15%" }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "20%" }}><Text style={pdfStyles.tableCellHeader}>Customer</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "15%" }}><Text style={pdfStyles.tableCellHeader}>Type</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "12%" }}><Text style={pdfStyles.tableCellHeader}>Qty</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "12%" }}><Text style={pdfStyles.tableCellHeader}>Price</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "14%" }}><Text style={pdfStyles.tableCellHeader}>Total</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "12%" }}><Text style={pdfStyles.tableCellHeader}>Method</Text></View>
            </View>
            {entries.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No sales entries found for this period.</Text></View>
              </View>
            ) : (
              entries.slice(0, 50).map((e, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: "15%" }}><Text style={pdfStyles.tableCell}>{e.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "20%" }}><Text style={pdfStyles.tableCell}>{e.customerName}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "15%" }}><Text style={pdfStyles.tableCell}>{e.customerType}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "12%" }}><Text style={pdfStyles.tableCell}>{e.quantitySold}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "12%" }}><Text style={pdfStyles.tableCell}>UGX {e.unitPrice.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "14%" }}><Text style={pdfStyles.tableCell}>UGX {e.totalAmount.toLocaleString()}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "12%" }}><Text style={pdfStyles.tableCell}>{e.paymentMethod}</Text></View>
                </View>
              ))
            )}
          </View>
          {entries.length > 50 && (
            <Text style={{ fontSize: 9, color: "#999", marginTop: 4 }}>
              Showing 50 of {entries.length} transactions.
            </Text>
          )}
        </View>

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
