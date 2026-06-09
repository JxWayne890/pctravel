window.PC_EMAIL_TEMPLATES = {
  clientConfirmation: {
    subject: "PC Fantasy Travel received your vacation request",
    body: [
      "Hi {{firstName}},",
      "",
      "Thank you! PC Fantasy Travel received your request. We'll review your trip details and follow up with next steps.",
      "",
      "Request summary:",
      "Destination: {{destination}}",
      "Travel dates: {{travelDates}}",
      "Travelers: {{travelers}}",
      "Package interest: {{packageName}}",
      "",
      "Prices, dates, cabins, rooms, and availability are subject to change until confirmed. Travel insurance is strongly recommended. Payments should be made only through approved supplier, vendor, or InteleTravel booking channels.",
      "",
      "We plan it. You live it. Love it.",
      "PC Fantasy Travel"
    ].join("\n")
  },
  leadNotification: {
    subject: "New PC Fantasy Travel lead: {{firstName}} {{lastName}}",
    body: [
      "A new travel request was submitted.",
      "",
      "Lead type: {{leadType}}",
      "Name: {{firstName}} {{lastName}}",
      "Email: {{email}}",
      "Phone: {{phone}}",
      "Preferred contact: {{preferredContact}}",
      "Best time: {{bestTime}}",
      "City/state: {{cityState}}",
      "Time zone: {{timeZone}}",
      "",
      "Destination: {{destination}}",
      "Departure city/airport: {{departureCity}}",
      "Travel dates: {{travelDates}}",
      "Flexible dates: {{datesFlexible}}",
      "Trip length: {{tripLength}}",
      "Travelers: {{travelers}}",
      "Rooms/cabins: {{roomsCabins}}",
      "Occasion: {{occasion}}",
      "",
      "Travel styles: {{travelStyles}}",
      "Budget: {{totalBudget}}",
      "Budget per person: {{budgetPerPerson}}",
      "Budget includes flights: {{budgetIncludesFlights}}",
      "Ready to book now: {{readyToBook}}",
      "Payment plan interest: {{paymentPlan}}",
      "Preferred deposit: {{depositRange}}",
      "",
      "Package interest: {{packageName}}",
      "Vendor link used: {{vendorLinkUsed}}",
      "",
      "Notes: {{notes}}"
    ].join("\n")
  }
};
