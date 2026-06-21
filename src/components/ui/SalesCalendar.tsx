import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from "date-fns";
import { SaleTransaction, Expense } from "@/types";

interface Props {
  transactions: SaleTransaction[];
  expenses: Expense[];
}

export function SalesCalendar({ transactions, expenses }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  
  const endDate = new Date(monthEnd);
  if (endDate.getDay() !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
  }

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const daySales = transactions.filter((t) => t.date === selectedDate);
  const dayExpenses = expenses.filter((e) => e.date === selectedDate);
  const dayRevenue = daySales.reduce((s, t) => s + t.totalAmount, 0);
  const dayExpenseTotal = dayExpenses.reduce((s, e) => s + e.amountUgx, 0);
  const dayNetProfit = dayRevenue - dayExpenseTotal;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">&lt;</button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">Today</button>
          <button onClick={nextMonth} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">&gt;</button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-gray-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="py-2 text-center text-xs font-medium text-gray-500 uppercase">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTrans = transactions.filter(t => t.date === dateStr);
          const rev = dayTrans.reduce((sum, t) => sum + t.totalAmount, 0);
          
          return (
            <div
              key={day.toISOString()}
              onClick={() => setSelectedDate(dateStr)}
              className={`min-h-[80px] p-2 border-r border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                !isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-400" : ""
              } ${isToday(day) ? "bg-blue-50/30" : ""} ${selectedDate === dateStr ? "ring-2 ring-inset ring-gray-900" : ""}`}
            >
              <div className={`text-xs font-semibold ${isToday(day) ? "text-blue-600" : "text-gray-700"}`}>
                {format(day, "d")}
              </div>
              {rev > 0 && (
                <div className="mt-1">
                  <div className="text-xs font-medium text-green-600">UGX {(rev/1000).toFixed(0)}k</div>
                  <div className="text-[10px] text-gray-500">{dayTrans.length} sales</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="p-6 border-t border-gray-200 bg-gray-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Details for {format(parseISO(selectedDate), "MMM do, yyyy")}</h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-gray-900">✕</button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500">Revenue</div>
              <div className="text-lg font-bold text-green-600">UGX {dayRevenue.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500">Expenses</div>
              <div className="text-lg font-bold text-red-600">UGX {dayExpenseTotal.toLocaleString()}</div>
            </div>
            <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
              <div className="text-xs text-gray-500">Net Profit</div>
              <div className={`text-lg font-bold ${dayNetProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                UGX {dayNetProfit.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Sales</h4>
              {daySales.length === 0 ? <p className="text-sm text-gray-500">No sales.</p> : (
                <ul className="space-y-2">
                  {daySales.map(s => (
                    <li key={s.id} className="text-sm flex justify-between bg-white p-2 rounded border border-gray-100">
                      <span>{s.customerName} ({s.quantitySold}x {s.packSize.toLowerCase()})</span>
                      <span className="font-medium">UGX {s.totalAmount.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Expenses</h4>
              {dayExpenses.length === 0 ? <p className="text-sm text-gray-500">No expenses.</p> : (
                <ul className="space-y-2">
                  {dayExpenses.map(e => (
                    <li key={e.id} className="text-sm flex justify-between bg-white p-2 rounded border border-gray-100">
                      <span className="truncate pr-2">{e.category.toLowerCase()} - {e.description}</span>
                      <span className="font-medium text-red-500 flex-shrink-0">UGX {e.amountUgx.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
