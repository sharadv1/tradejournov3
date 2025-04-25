import React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

interface CalendarProps {
  tradeData: {
    date: string;
    pl: number;
    tradeCount: number;
  }[];
}

const Calendar: React.FC<CalendarProps> = ({ tradeData }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const prevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Generate days for the current month view
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
  const startDay = getDay(monthStart);

  // Create a map of date strings to trade data for quick lookup
  const tradeDataMap = tradeData.reduce(
    (acc, item) => {
      const dateKey = item.date;
      acc[dateKey] = {
        pl: item.pl,
        tradeCount: item.tradeCount,
      };
      return acc;
    },
    {} as Record<string, { pl: number; tradeCount: number }>,
  );

  // Days of the week
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full bg-background">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <CalendarIcon className="mr-2 h-5 w-5" />
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Days of week headers */}
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="text-center py-2 font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Empty cells for days before the start of the month */}
        {Array.from({ length: startDay }).map((_, index) => (
          <div
            key={`empty-start-${index}`}
            className="h-24 border rounded-md p-1"
          />
        ))}

        {/* Calendar days */}
        {daysInMonth.map((day) => {
          const dateStr = format(day, "MM/dd");
          const dayData = tradeDataMap[dateStr];
          const hasData = !!dayData;
          const isProfitable = hasData && dayData.pl > 0;
          const isLoss = hasData && dayData.pl < 0;

          return (
            <div
              key={day.toString()}
              className={`h-24 border rounded-md p-1 relative ${isToday(day) ? "border-primary border-2" : ""} ${
                hasData
                  ? isProfitable
                    ? "bg-green-50"
                    : isLoss
                      ? "bg-red-50"
                      : ""
                  : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <span
                  className={`text-sm font-medium ${
                    isToday(day)
                      ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              {hasData && (
                <div className="mt-2 text-center">
                  <p
                    className={`text-lg font-semibold ${
                      isProfitable
                        ? "text-green-600"
                        : isLoss
                          ? "text-red-600"
                          : ""
                    }`}
                  >
                    {isProfitable ? "$" : isLoss ? "-$" : "$"}
                    {Math.abs(dayData.pl).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {dayData.tradeCount}{" "}
                    {dayData.tradeCount === 1 ? "trade" : "trades"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
