var la = {
  code: "la",
  week: {
    dow: 1, // Monday is the first day of the week.
    doy: 4  // The week that contains Jan 4th is the first week of the year.
  },
  buttonText: {
    prev: "Prior",
    next: "Prox",
    today: "Hodie",
    year: "Annum",
    month: "Mensis",
    week: "Hebdomada",
    day: "Dies",
    list: "Agenda"
  },
  weekText: "Hb",
  allDayText: "Tota die",
  moreLinkText(n) {
    return "+alii " + n;
  },
  noEventsText: "Rei gestae non sunt"
};
export default la;
