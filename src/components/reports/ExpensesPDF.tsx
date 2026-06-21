import React from "react";
import { Page, Text, View, Document } from "@react-pdf/renderer";
import { pdfStyles, colWidth } from "./PDFStyles";

interface ExpenseEntry {
  date: string;
  category: string;
  description: string;
  amountUgx: number;
  paidBy: string;
}

interface CategoryTotal {
  label: string;
  value: number;
}

interface ExpensesPDFProps {
  title: string;
  period: string;
  entries: ExpenseEntry[];
  totalExpenses: number;
  byCategory: CategoryTotal[];
  topExpenses: ExpenseEntry[];
}

export function ExpensesPDF({
  title, period, entries, totalExpenses, byCategory, topExpenses,
}: ExpensesPDFProps) {
  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.title}>Star Durable Pads</Text>
          <Text style={pdfStyles.subtitle}>{title} &mdash; {period}</Text>
        </View>

        <View style={pdfStyles.summaryBox}>
          <Text style={pdfStyles.summaryTitle}>Expenses Summary</Text>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Expenses</Text>
            <Text style={pdfStyles.summaryValue}>UGX {totalExpenses.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Total Entries</Text>
            <Text style={pdfStyles.summaryValue}>{entries.length.toLocaleString()}</Text>
          </View>
          <View style={pdfStyles.summaryRow}>
            <Text style={pdfStyles.summaryLabel}>Avg Per Entry</Text>
            <Text style={pdfStyles.summaryValue}>UGX {entries.length > 0 ? Math.round(totalExpenses / entries.length).toLocaleString() : "0"}</Text>
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Expenses by Category</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: "60%" }}><Text style={pdfStyles.tableCellHeader}>Category</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: "40%" }}><Text style={pdfStyles.tableCellHeader}>Amount (UGX)</Text></View>
            </View>
            {byCategory.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No expenses found.</Text></View>
              </View>
            ) : (
              byCategory.map((c, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: "60%" }}><Text style={pdfStyles.tableCell}>{c.label}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: "40%" }}><Text style={pdfStyles.tableCell}>UGX {c.value.toLocaleString()}</Text></View>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Top Expenses</Text>
          <View style={pdfStyles.table}>
            <View style={pdfStyles.tableRow}>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Date</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(20) }}><Text style={pdfStyles.tableCellHeader}>Category</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(36) }}><Text style={pdfStyles.tableCellHeader}>Description</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(16) }}><Text style={pdfStyles.tableCellHeader}>Paid By</Text></View>
              <View style={{ ...pdfStyles.tableColHeader, width: colWidth(14) }}><Text style={pdfStyles.tableCellHeader}>Amount</Text></View>
            </View>
            {topExpenses.length === 0 ? (
              <View style={pdfStyles.tableRow}>
                <View style={{ ...pdfStyles.tableCol, width: "100%" }}><Text style={pdfStyles.tableCell}>No expenses found.</Text></View>
              </View>
            ) : (
              topExpenses.map((e, i) => (
                <View style={pdfStyles.tableRow} key={i}>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>{e.date}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(20) }}><Text style={pdfStyles.tableCell}>{e.category}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(36) }}><Text style={pdfStyles.tableCell}>{e.description}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(16) }}><Text style={pdfStyles.tableCell}>{e.paidBy}</Text></View>
                  <View style={{ ...pdfStyles.tableCol, width: colWidth(14) }}><Text style={pdfStyles.tableCell}>UGX {e.amountUgx.toLocaleString()}</Text></View>
                </View>
              ))
            )}
          </View>
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
