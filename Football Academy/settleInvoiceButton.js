var SettleInvoice = (function () {
 
    // ─── FORM BUTTON ────────────────────────────────────────────────────────────
 
    function settleFromForm(formContext) {
        var invoiceId = formContext.data.entity.getId().replace(/[{}]/g, "");
        var statusCode = formContext.getAttribute("statuscode").getValue();
        var customer = formContext.getAttribute("customerid").getValue();
        var invoiceNumber = formContext.getAttribute("invoicenumber").getValue();
        var invoiceAmount = formContext.getAttribute("totalamount").getValue();
 
        if (!customer || customer.length === 0) {
            Xrm.Navigation.openAlertDialog({ text: "Invoice " + invoiceNumber + " was not settled. No customer found on invoice." });
            return;
        }
 
        // Invoice must be Active (statecode 0)
        if (statusCode !== 1) {
            Xrm.Navigation.openAlertDialog({ text: "Invoice " + invoiceNumber + " was not settled. Invoice must be Active." });
            return;
        }
 
        var customerId = customer[0].id.replace(/[{}]/g, "");
 
        processSingleInvoice(invoiceId, customerId, invoiceNumber, invoiceAmount, function (message) {
            Xrm.Navigation.openAlertDialog({ text: message }).then(function () {
                formContext.data.refresh(true);
            });
        });
    }
 
    // ─── GRID/VIEW BUTTON ───────────────────────────────────────────────────────
 
    function settleFromGrid(selectedRecords) {
        if (!selectedRecords || selectedRecords.length === 0) {
            Xrm.Navigation.openAlertDialog({ text: "Please select at least one Invoice record." });
            return;
        }
 
        var messages = [];
        var processed = 0;
        var total = selectedRecords.length;
 
        selectedRecords.forEach(function (record) {
            var invoiceId = record.Id.replace(/[{}]/g, "");
 
            Xrm.WebApi.retrieveRecord(
                "invoice",
                invoiceId,
                "?$select=invoicenumber,totalamount,statuscode,_customerid_value"
            ).then(
                function (invoice) {
                    var statusCode = invoice["statuscode"];
                    var invoiceNumber = invoice["invoicenumber"];
                    var invoiceAmount = invoice["totalamount"];
                    var customerId = invoice["_customerid_value"];
 
                    if (!customerId) {
                        messages.push("Invoice " + invoiceNumber + " was not settled. No customer found on invoice.");
                        processed++;
                        checkIfDone(processed, total, messages);
                        return;
                    }
 
                    // Invoice must be Active (statuscode 1 = Active)
                    if (statusCode !== 1) {
                        messages.push("Invoice " + invoiceNumber + " was not settled. Invoice must be Active.");
                        processed++;
                        checkIfDone(processed, total, messages);
                        return;
                    }
 
                    processSingleInvoice(invoiceId, customerId, invoiceNumber, invoiceAmount, function (message) {
                        messages.push(message);
                        processed++;
                        checkIfDone(processed, total, messages);
                    });
                },
                function (error) {
                    messages.push("Invoice ID " + invoiceId + " was not settled. Retrieve failed: " + error.message);
                    processed++;
                    checkIfDone(processed, total, messages);
                }
            );
        });
    }
 
    // ─── CORE LOGIC ─────────────────────────────────────────────────────────────
 
    function processSingleInvoice(invoiceId, customerId, invoiceNumber, invoiceAmount, callback) {
 
        // Step 1: Find Active or Partially Settled payments for the same customer sorted by date ASC
        var query = "?$select=axm365_paymentsid,axm365_transactionid,axm365_amount,createdon" +
                    "&$filter=_axm365_customer_value eq " + customerId +
                    " and (statuscode eq 1 or statuscode eq 693080001)" +
                    "&$orderby=createdon asc";
 
        Xrm.WebApi.retrieveMultipleRecords("axm365_payments", query).then(
            function (result) {
                if (result.entities.length === 0) {
                    callback("Invoice " + invoiceNumber + " was not settled. No active payments found for this customer.");
                    return;
                }
 
                // Step 2: Find first payment where amount matches invoice amount
                var matchedPayment = null;
                for (var i = 0; i < result.entities.length; i++) {
                    var payment = result.entities[i];
                    if (payment["axm365_amount"] === invoiceAmount) {
                        matchedPayment = payment;
                        break;
                    }
                }
 
                if (!matchedPayment) {
                    callback("Invoice " + invoiceNumber + " was not settled. No matching payment amount found.");
                    return;
                }
 
                var paymentId = matchedPayment["axm365_paymentsid"].replace(/[{}]/g, "");
                var transactionId = matchedPayment["axm365_transactionid"];
 
                // Step 3: Create Invoice Settlement record (bridge)
                var settlementRecord = {
                    "axm365_Payment@odata.bind": "/axm365_paymentses(" + paymentId + ")",
                    "axm365_Invoice@odata.bind": "/invoices(" + invoiceId + ")"
                };
 
                Xrm.WebApi.createRecord("axm365_invoicesettelment", settlementRecord).then(
                    function () {
 
                        // Step 4: Close invoice as Paid
                        Xrm.WebApi.updateRecord("invoice", invoiceId, { statecode: 2, statuscode: 100001 }).then(
                            function () {
 
                                // Step 5: Update payment to Settled + Inactive
                                Xrm.WebApi.updateRecord("axm365_payments", paymentId, { statecode: 1, axm365_state: 693080002 }).then(
                                    function () {
                                        callback("Invoice " + invoiceNumber + " was successfully settled with payment " + transactionId + ".");
                                    },
                                    function (error) {
                                        callback("Invoice " + invoiceNumber + " was not settled. Error updating payment state: " + error.message);
                                    }
                                );
                            },
                            function (error) {
                                callback("Invoice " + invoiceNumber + " was not settled. Error closing invoice: " + error.message);
                            }
                        );
                    },
                    function (error) {
                        callback("Invoice " + invoiceNumber + " was not settled. Error creating settlement record: " + error.message);
                    }
                );
            },
            function (error) {
                callback("Invoice " + invoiceNumber + " was not settled. Error retrieving payments: " + error.message);
            }
        );
    }
 
    // ─── GRID COMPLETION CHECK ───────────────────────────────────────────────────
 
    function checkIfDone(processed, total, messages) {
        if (processed < total) return;
 
        var message = messages.join("\n\n");
        Xrm.Navigation.openAlertDialog({ text: message }).then(function () {
            window.parent.location.reload();
        });
    }
 
    return {
        settleFromForm: settleFromForm,
        settleFromGrid: settleFromGrid
    };
 
})();