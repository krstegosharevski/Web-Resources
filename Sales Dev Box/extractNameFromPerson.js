if (typeof (axm) === "undefined") {
    axm = { __namespace: true };
}
if (typeof (axm.person) === "undefined") {
    axm.person = { __namespace: true };
}
 
axm.person.Event = (function () {
 
    function onLoad(executionContext){
        if (!executionContext) return;
        const formContext = executionContext.getFormContext();
        let person = formContext.getAttribute("axm365_responsibility")?.getValue()
        console.log(person);
    }
 
    return {
        OnLoad: onLoad
    };
})();
 
 
if (typeof (axm) === "undefined") {
    axm = { __namespace: true };
}
if (typeof (axm.person) === "undefined") {
    axm.person = { __namespace: true };
}
 
axm.person.Event = (function () {
 
    async function onSave(executionContext) {
        if (!executionContext) return;
 
        const formContext = executionContext.getFormContext();
        const personLookup = formContext.getAttribute("axm365_person")?.getValue();
 
        if (personLookup && personLookup.length > 0) {
            const personId = personLookup[0].id.replace(/[{}]/g, "");
 
            try {
                const person = await Xrm.WebApi.retrieveRecord(
                    "axm365_person",
                    personId,
                    "?$select=firstname,lastname"
                );
 
                const fullName = `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim();
 
                formContext.getAttribute("axm365_name")?.setValue(fullName);
 
                console.log(`Full name set to: ${fullName}`);
 
            } catch (error) {
                console.error("Error retrieving person:", error);
            }
        } else {
            console.log("No person selected in lookup.");
        }
    }
 
    return {
        OnSave: onSave
    };
})();
 
if (typeof (axm) === "undefined") {
    axm = { __namespace: true };
}
if (typeof (axm.person) === "undefined") {
    axm.person = { __namespace: true };
}
 
axm.person.Event = (function () {
 
    async function onPersonChange(executionContext) {
        if (!executionContext) return;
 
        const formContext = executionContext.getFormContext();
        const personLookup = formContext.getAttribute("axm365_person")?.getValue();
 
        if (personLookup && personLookup.length > 0) {
            const personId = personLookup[0].id.replace(/[{}]/g, "");
            const entitySetName = personLookup[0].entityType;
 
            try {
                const person = await Xrm.WebApi.retrieveRecord(
                    entitySetName,
                    personId,
                    "?$select=firstname,lastname"
                );
 
                const fullName = `${person.firstname ?? ""} ${person.lastname ?? ""}`.trim();
                formContext.getAttribute("axm365_name")?.setValue(fullName);
 
                console.log(`Full name set to: ${fullName}`);
 
            } catch (error) {
                console.error("Error retrieving person:", error);
            }
        } else {
            formContext.getAttribute("axm365_name")?.setValue(null);
        }
    }
 
    return {
        OnPersonChange: onPersonChange
    };
})();
 
 
 
 
 
"use strict";
if (typeof axm === "undefined") {
  var axm = { __namespace: true };
}
if (typeof axm.Booking === "undefined") {
  axm.Booking = { __namespace: true };
}
 
axm.Booking.Events = (function () {
  const CONSTANTS = {
    ENTITY: {
      PASSENGER: "axm_passenger",
      PASSPORT: "axm_passport",
      FLIGHT: "axm_flight",
    },
    ATTRIBUTE: {
      PASSENGER_ID: "axm_passengerid",
      PASSENGER_FULL_NAME: "axm_passengerfullname",
      PASSENGER_TYPE: "axm_passengertype",
      PRIMARY_PASSENGER_LOOKUP: "axm_primarypassenger",
      PASSENGER_EMAIL: "axm_passengeremail",
      PASSENGER_PHONE: "axm_passengerphonenumber",
      CREATED_ON: "createdon",
      STATE_CODE: "statecode",
      BOOKING_TYPE: "axm_bookingtype",
      BOOKING_PASSENGER_LOOKUP: "axm_bookingticketpassenger",
      BOOKING_TICKET_PRICE_PER_PERSON: "axm_bookingticketpriceperperson",
      BOOKING_TOTAL_PRICE: "axm_bookingtotalprice",
      BOOKING_EMAIL: "axm_bookingemail",
      BOOKING_PHONE_NUMBER: "axm_bookingphonenumber",
      BOOKING_PASSPORT_LOOKUP: "axm_bookingpassport",
      BOOKING_FLIGHT_LOOKUP: "axm_bookingflight",
      PASSPORT_ID: "axm_passportid",
      PASSPORT_NUMBER: "axm_passportnumber",
      PASSPORT_EXPIRY_DATE: "axm_passportexpirydate",
      PASSPORT_PASSENGER_LOOKUP: "axm_passenger",
      FLIGHT_DEPARTURE_TIME: "axm_flightdeparturetime",
    },
    CONTROL: {
      PASSENGER_LOOKUP: "axm_bookingticketpassenger",
      PASSPORT_LOOKUP: "axm_bookingpassport",
      FLIGHT_LOOKUP: "axm_bookingflight",
      TOTAL_PRICE: "axm_bookingtotalprice",
    },
    BOOKING_TYPES: { GROUP: 282460000, INDIVIDUAL: 282460001 },
    PASSENGER_TYPES: {
      PRIMARY: 282460000,
      INDIVIDUAL: 282460001,
      CHILD: 282460002,
    },
    PASSENGER_VIEW: {
      ID: "{b31efd65-510c-4b80-a0f1-ac6e205b1555}",
      NAME: "Filtered Passenger Lookup View",
      LAYOUT_XML: "",
    },
    NOTIFICATION_IDS: {
      PASSPORT_EXPIRY: "passportExpiryCheckNotification",
    },
  };
 
  CONSTANTS.PASSENGER_VIEW.LAYOUT_XML = `<grid name='resultset' jump='${CONSTANTS.ATTRIBUTE.PASSENGER_FULL_NAME}' select='1' icon='1' preview='1'><row name='result' id='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}'><cell name='${CONSTANTS.ATTRIBUTE.PASSENGER_FULL_NAME}' width='300'/><cell name='${CONSTANTS.ATTRIBUTE.PASSENGER_TYPE}' width='150'/><cell name='${CONSTANTS.ATTRIBUTE.CREATED_ON}' width='125'/></row></grid>`;
 
  const getAttr = (formContext, attrName) => formContext.getAttribute(attrName);
  const getControl = (formContext, controlName) => formContext.getControl(controlName);
  const getLookupId = (lookupValue) => lookupValue?.[0]?.id.replace(/[{}]/g, "");
 
  var _buildPassengerFilterParts = function(bookingType) {
    let filterXml = `<filter type='and'><condition attribute='${CONSTANTS.ATTRIBUTE.STATE_CODE}' operator='eq' value='0' /></filter>`;
    let linkEntityXml = "";
   
    if (bookingType === CONSTANTS.BOOKING_TYPES.GROUP) {
      filterXml = `<filter type='and'>
                   <condition attribute='${CONSTANTS.ATTRIBUTE.PASSENGER_TYPE}' operator='eq' value='${CONSTANTS.PASSENGER_TYPES.PRIMARY}' />
                   <condition attribute='${CONSTANTS.ATTRIBUTE.STATE_CODE}' operator='eq' value='0' />
                   </filter>`;
    } else if (bookingType === CONSTANTS.BOOKING_TYPES.INDIVIDUAL) {
      filterXml = `<filter type='and'>
                   <condition attribute='${CONSTANTS.ATTRIBUTE.PASSENGER_TYPE}' operator='eq' value='${CONSTANTS.PASSENGER_TYPES.PRIMARY}' />
                   <condition attribute='${CONSTANTS.ATTRIBUTE.STATE_CODE}' operator='eq' value='0' />
                   <condition attribute='${CONSTANTS.ATTRIBUTE.PRIMARY_PASSENGER_LOOKUP}' operator='null' />
                   <condition entityname='related_passenger' attribute='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}' operator='null' />
                   </filter>`;
      linkEntityXml = `<link-entity name='${CONSTANTS.ENTITY.PASSENGER}' from='${CONSTANTS.ATTRIBUTE.PRIMARY_PASSENGER_LOOKUP}' to='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}' link-type='outer' alias='related_passenger' />`;
    }
   
    return { filterXml, linkEntityXml };
  };
 
  var _buildPassportFilterParts = function(passengerId){
    const filterXml = !passengerId
      ? `<filter type='and'><condition attribute='${CONSTANTS.ATTRIBUTE.PASSPORT_ID}' operator='null' /></filter>`
      : `<filter type='and'>
         <condition attribute='${CONSTANTS.ATTRIBUTE.STATE_CODE}' operator='eq' value='0' />
         <condition attribute='${CONSTANTS.ATTRIBUTE.PASSPORT_PASSENGER_LOOKUP}' operator='eq' value='${passengerId}' />
         </filter>`
    return filterXml
  };
 
  var _applyPassengerViewFilter = function(formContext){
    const control = getControl(formContext, CONSTANTS.CONTROL.PASSENGER_LOOKUP);
    if (!control) return;
   
    const bookingType = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_TYPE)?.getValue() || null;
    const { filterXml, linkEntityXml } = _buildPassengerFilterParts(bookingType);
   
    const fetchXml = `<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>
                      <entity name='${CONSTANTS.ENTITY.PASSENGER}'>
                        <attribute name='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}'/>
                        <attribute name='${CONSTANTS.ATTRIBUTE.PASSENGER_FULL_NAME}'/>
                        <attribute name='${CONSTANTS.ATTRIBUTE.CREATED_ON}'/>
                        <attribute name='${CONSTANTS.ATTRIBUTE.PASSENGER_TYPE}'/>
                        <attribute name='${CONSTANTS.ATTRIBUTE.PRIMARY_PASSENGER_LOOKUP}'/>
                        ${linkEntityXml}
                        ${filterXml}
                        <order attribute='${CONSTANTS.ATTRIBUTE.PASSENGER_FULL_NAME}' descending='false'/>
                      </entity>
                     </fetch>`;
 
    try {
      control.addCustomView(
        CONSTANTS.PASSENGER_VIEW.ID,
        CONSTANTS.ENTITY.PASSENGER,
        CONSTANTS.PASSENGER_VIEW.NAME,
        fetchXml,
        CONSTANTS.PASSENGER_VIEW.LAYOUT_XML,
        true
      );
    } catch (err) {
      console.error(`Error applying custom view to control '${control.getName()}':`, err.message || err);
    }
  };
 
  var _applyPassportControlFilter = function(formContext){
    const control = getControl(formContext, CONSTANTS.CONTROL.PASSPORT_LOOKUP);
    if (!control) return;
   
    const passengerVal = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSENGER_LOOKUP)?.getValue();
    const passengerId = passengerVal?.length ? getLookupId(passengerVal) : null;
   
    try {
      if(passengerId){
        const filterXml = _buildPassportFilterParts(passengerId);
        control.addCustomFilter(filterXml, CONSTANTS.ENTITY.PASSPORT);
      } else {
        const emptyFilter = `<filter type='and'><condition attribute='${CONSTANTS.ATTRIBUTE.PASSPORT_ID}' operator='eq' value='00000000-0000-0000-0000-000000000000' /></filter>`;
        control.addCustomFilter(emptyFilter, CONSTANTS.ENTITY.PASSPORT);
      }
    } catch (e) {
      console.error(`Error adding custom filter to passport control: ${e}`);
    }
  };
 
  var _calculateAndSetTotalPrice = async function(formContext){
    const priceAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_TICKET_PRICE_PER_PERSON);
    const totalAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_TOTAL_PRICE);
    const passengerAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSENGER_LOOKUP);
   
    if (!priceAttr || !totalAttr || !passengerAttr) {
      totalAttr?.setValue(null);
      return;
    }
   
    const pricePerPerson = priceAttr.getValue();
    const passengerVal = passengerAttr.getValue();
   
    if (pricePerPerson === null || pricePerPerson <= 0 || !passengerVal?.length) {
      totalAttr.setValue(null);
      return;
    }
   
    const primaryPassengerId = getLookupId(passengerVal);
    Xrm.Utility.showProgressIndicator("Calculating total price...");
   
    try {
      const fetchXml = `?fetchXml=<fetch mapping='logical' distinct='false'>
                        <entity name='${CONSTANTS.ENTITY.PASSENGER}'>
                          <attribute name='${CONSTANTS.ATTRIBUTE.PASSENGER_TYPE}'/>
                          <attribute name='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}'/>
                          <filter type='or'>
                            <condition attribute='${CONSTANTS.ATTRIBUTE.PASSENGER_ID}' operator='eq' value='${primaryPassengerId}'/>
                            <condition attribute='${CONSTANTS.ATTRIBUTE.PRIMARY_PASSENGER_LOOKUP}' operator='eq' value='${primaryPassengerId}'/>
                          </filter>
                          <filter type='and'>
                            <condition attribute='${CONSTANTS.ATTRIBUTE.STATE_CODE}' operator='eq' value='0'/>
                          </filter>
                        </entity>
                       </fetch>`;
                       
      const results = await Xrm.WebApi.retrieveMultipleRecords(CONSTANTS.ENTITY.PASSENGER, fetchXml);
     
      const totalPrice = (results.entities || []).reduce((total, passenger) => {
        const isChild = passenger[CONSTANTS.ATTRIBUTE.PASSENGER_TYPE] === CONSTANTS.PASSENGER_TYPES.CHILD;
        return total + (isChild ? pricePerPerson * 0.5 : pricePerPerson);
      }, 0);
     
      totalAttr.setValue(Number(totalPrice));
    } catch (error) {
      totalAttr.setValue(null);
    } finally {
      Xrm.Utility.closeProgressIndicator();
    }
  };
 
  var _setEmailAndPhoneFields = async function(formContext){
    const passengerAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSENGER_LOOKUP);
    const emailAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_EMAIL);
    const phoneAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PHONE_NUMBER);
   
    if (!passengerAttr || !emailAttr || !phoneAttr) return;
   
    const val = passengerAttr.getValue();
    if (!val?.length) {
      emailAttr.setValue(null);
      phoneAttr.setValue(null);
      return;
    }
   
    try {
      const result = await Xrm.WebApi.retrieveRecord(
        val[0].entityType,
        getLookupId(val),
        `?$select=${CONSTANTS.ATTRIBUTE.PASSENGER_EMAIL},${CONSTANTS.ATTRIBUTE.PASSENGER_PHONE}`
      );
     
      emailAttr.setValue(result[CONSTANTS.ATTRIBUTE.PASSENGER_EMAIL] || null);
      phoneAttr.setValue(result[CONSTANTS.ATTRIBUTE.PASSENGER_PHONE] || null);
    } catch {
      emailAttr.setValue(null);
      phoneAttr.setValue(null);
    }
  };
 
  var _changeTotalPriceVisibility = function(formContext){
    if (!formContext) return;
   
    const totalPriceControl = getControl(formContext, CONSTANTS.CONTROL.TOTAL_PRICE);
    const passengerControl = getControl(formContext, CONSTANTS.CONTROL.PASSENGER_LOOKUP);
   
    if (!totalPriceControl || !passengerControl) return;
   
    const hasPassenger = passengerControl.getAttribute().getValue() !== null;
    totalPriceControl.setVisible(hasPassenger);
  };
 
  var _validatePassportExpiry = async function(formContext){
    const passportControl = getControl(formContext, CONSTANTS.CONTROL.PASSPORT_LOOKUP);
    if (!passportControl) return;
   
    const notificationId = CONSTANTS.NOTIFICATION_IDS.PASSPORT_EXPIRY;
    passportControl.clearNotification(notificationId);
   
    const passportAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSPORT_LOOKUP);
    const flightAttr = getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_FLIGHT_LOOKUP);
   
    if (!passportAttr || !flightAttr) return;
   
    const passportValue = passportAttr.getValue();
    const flightValue = flightAttr.getValue();
   
    if (!passportValue?.length || !flightValue?.length) return;
   
    const passportId = getLookupId(passportValue);
    const flightId = getLookupId(flightValue);
   
    try {
      const [passportResult, flightResult] = await Promise.all([
        Xrm.WebApi.retrieveRecord(
          passportValue[0].entityType,
          passportId,
          `?$select=${CONSTANTS.ATTRIBUTE.PASSPORT_EXPIRY_DATE}`
        ),
        Xrm.WebApi.retrieveRecord(
          flightValue[0].entityType,
          flightId,
          `?$select=${CONSTANTS.ATTRIBUTE.FLIGHT_DEPARTURE_TIME}`
        ),
      ]);
     
      const expiryDateStr = passportResult[CONSTANTS.ATTRIBUTE.PASSPORT_EXPIRY_DATE];
      const departureTimeStr = flightResult[CONSTANTS.ATTRIBUTE.FLIGHT_DEPARTURE_TIME];
     
      if (!expiryDateStr || !departureTimeStr) return;
     
      const expiryDate = new Date(expiryDateStr);
      const departureTime = new Date(departureTimeStr);
      expiryDate.setHours(0, 0, 0, 0);
      departureTime.setHours(0, 0, 0, 0);
     
      if (expiryDate < departureTime) {
        passportControl.setNotification(
          `ERROR: Passport expires before flight departure (${expiryDate.toLocaleDateString()}).`,
          notificationId
        );
      }
    } catch (error) {
      passportControl.setNotification("Could not validate passport expiry date.", notificationId);
    }
  };
 
  var _handleChange = function(executionContext, handler){
    if (!executionContext) return;
    handler(executionContext.getFormContext());
  };
 
  var _handleBookingTypeChange = function(executionContext){
    _handleChange(executionContext, formContext => {
      getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSENGER_LOOKUP)?.setValue(null);
      _applyPassengerViewFilter(formContext);
    });
  };
 
  var _handlePassengerChange = function(executionContext){
    _handleChange(executionContext, formContext => {
      getAttr(formContext, CONSTANTS.ATTRIBUTE.BOOKING_PASSPORT_LOOKUP)?.setValue(null);
      _changeTotalPriceVisibility(formContext);
      _applyPassportControlFilter(formContext);
      _calculateAndSetTotalPrice(formContext);
      _setEmailAndPhoneFields(formContext);
    });
  };
 
  var _handlePricePerPersonChange = function(executionContext){
    _handleChange(executionContext, _calculateAndSetTotalPrice);
  };
  var _handlePassportChange = function(executionContext){
    _handleChange(executionContext, _validatePassportExpiry);
  };
 
  var _handleFlightChange = function(executionContext){
    _handleChange(executionContext, _validatePassportExpiry);
  };
 
  var onLoad = function(executionContext){
    if (!executionContext) return;
    const formContext = executionContext.getFormContext();
   
    const preSearchHandler = () => {
      _applyPassengerViewFilter(formContext);
      _applyPassportControlFilter(formContext);
    };
   
    getControl(formContext, CONSTANTS.CONTROL.PASSENGER_LOOKUP)?.addPreSearch(preSearchHandler);
    getControl(formContext, CONSTANTS.CONTROL.PASSPORT_LOOKUP)?.addPreSearch(preSearchHandler);
   
    [
      { attr: CONSTANTS.ATTRIBUTE.BOOKING_TYPE, handler: _handleBookingTypeChange },
      { attr: CONSTANTS.ATTRIBUTE.BOOKING_PASSENGER_LOOKUP, handler: _handlePassengerChange },
      { attr: CONSTANTS.ATTRIBUTE.BOOKING_TICKET_PRICE_PER_PERSON, handler: _handlePricePerPersonChange },
      { attr: CONSTANTS.ATTRIBUTE.BOOKING_PASSPORT_LOOKUP, handler: _handlePassportChange },
      { attr: CONSTANTS.ATTRIBUTE.BOOKING_FLIGHT_LOOKUP, handler: _handleFlightChange }
    ].forEach(({ attr, handler }) => getAttr(formContext, attr)?.addOnChange(handler));
   
    _calculateAndSetTotalPrice(formContext);
    _setEmailAndPhoneFields(formContext);
    _validatePassportExpiry(formContext);
    _applyPassportControlFilter(formContext);
  };
 
  return { OnLoad: onLoad };
})();