var SettlePayment = (function () {
 
    // ─── FORM BUTTON ────────────────────────────────────────────────────────────
 
    function settleFromForm(formContext) {
        var paymentId = formContext.data.entity.getId().replace(/[{}]/g, "");
        var statusCode = formContext.getAttribute("statuscode").getValue();
        var customer = formContext.getAttribute("axm365_customer").getValue();
        var transactionId = formContext.getAttribute("axm365_transactionid").getValue();
        var paymentAmount = formContext.getAttribute("axm365_amount").getValue();
 
        if (!customer || customer.length === 0) {
            Xrm.Navigation.openAlertDialog({ text: "Payment with " + transactionId + " was not settled. No customer found on payment." });
            return;
        }
 
        if (statusCode !== 1 && statusCode !== 693080001) {
            Xrm.Navigation.openAlertDialog({ text: "Payment with " + transactionId + " was not settled. Payment must be Active or Partially Settled." });
            return;
        }
 
        var customerId = customer[0].id.replace(/[{}]/g, "");
 
        processSinglePayment(paymentId, customerId, transactionId, paymentAmount, function (message) {
            Xrm.Navigation.openAlertDialog({ text: message }).then(function () {
                formContext.data.refresh(true);
            });
        });
    }
 
    // ─── GRID/VIEW BUTTON ───────────────────────────────────────────────────────
 
    function settleFromGrid(selectedRecords) {
        if (!selectedRecords || selectedRecords.length === 0) {
            Xrm.Navigation.openAlertDialog({ text: "Please select at least one Payment record." });
            return;
        }
 
        var messages = [];
        var processed = 0;
        var total = selectedRecords.length;
 
        selectedRecords.forEach(function (record) {
            var paymentId = record.Id.replace(/[{}]/g, "");
 
            Xrm.WebApi.retrieveRecord(
                "axm365_payments",
                paymentId,
                "?$select=axm365_transactionid,axm365_amount,statuscode,_axm365_customer_value"
            ).then(
                function (payment) {
                    var statusCode = payment["statuscode"];
                    var transactionId = payment["axm365_transactionid"];
                    var paymentAmount = payment["axm365_amount"];
                    var customerId = payment["_axm365_customer_value"];
 
                    if (!customerId) {
                        messages.push("Payment with " + transactionId + " was not settled. No customer found on payment.");
                        processed++;
                        checkIfDone(processed, total, messages);
                        return;
                    }
 
                    if (statusCode !== 1 && statusCode !== 693080001) {
                        messages.push("Payment with " + transactionId + " was not settled. Payment must be Active or Partially Settled.");
                        processed++;
                        checkIfDone(processed, total, messages);
                        return;
                    }
 
                    processSinglePayment(paymentId, customerId, transactionId, paymentAmount, function (message) {
                        messages.push(message);
                        processed++;
                        checkIfDone(processed, total, messages);
                    });
                },
                function (error) {
                    messages.push("Payment ID " + paymentId + " was not settled. Retrieve failed: " + error.message);
                    processed++;
                    checkIfDone(processed, total, messages);
                }
            );
        });
    }
 
    // ─── CORE LOGIC ─────────────────────────────────────────────────────────────
 
    function processSinglePayment(paymentId, customerId, transactionId, paymentAmount, callback) {
 
        // Step 1: Find open invoices for the same customer sorted by date ASC
        var query = "?$select=invoiceid,invoicenumber,totalamount,createdon" +
                    "&$filter=_customerid_value eq " + customerId +
                    " and statecode eq 0" +
                    "&$orderby=createdon asc";
 
        Xrm.WebApi.retrieveMultipleRecords("invoice", query).then(
            function (result) {
                if (result.entities.length === 0) {
                    callback("Payment with " + transactionId + " was not settled. No open invoices found for this customer.");
                    return;
                }
 
                // Step 2: Find first invoice where amount matches payment amount
                var matchedInvoice = null;
                for (var i = 0; i < result.entities.length; i++) {
                    var invoice = result.entities[i];
                    if (invoice["totalamount"] === paymentAmount) {
                        matchedInvoice = invoice;
                        break;
                    }
                }
 
                if (!matchedInvoice) {
                    callback("Payment with " + transactionId + " was not settled. No matching invoice amount found.");
                    return;
                }
 
                var invoiceId = matchedInvoice["invoiceid"].replace(/[{}]/g, "");
                var invoiceNumber = matchedInvoice["invoicenumber"];
 
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
                                Xrm.WebApi.updateRecord("axm365_payments", paymentId, { statecode : 1,  axm365_state: 693080002}).then(
                                    function () {
                                        callback("Payment with " + transactionId + " was successfully settled with " + invoiceNumber + ".");
                                    },
                                    function (error) {
                                        callback("Payment with " + transactionId + " was not settled. Error updating payment state: " + error.message);
                                    }
                                );
                            },
                            function (error) {
                                callback("Payment with " + transactionId + " was not settled. Error closing invoice: " + error.message);
                            }
                        );
                    },
                    function (error) {
                        callback("Payment with " + transactionId + " was not settled. Error creating settlement record: " + error.message);
                    }
                );
            },
            function (error) {
                callback("Payment with " + transactionId + " was not settled. Error retrieving invoices: " + error.message);
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