function settleInvoice(formContext, closeForm) {
 
    var payment = formContext.getAttribute("axm365_payment").getValue();
    var invoice = formContext.getAttribute("axm365_invoice").getValue();
 
    if (!payment || !invoice) {
        Xrm.Navigation.openAlertDialog({ text: "Please select both Payment and Invoice." });
        return;
    }
 
    var paymentId = payment[0].id.replace(/[{}]/g, "");
    var invoiceId = invoice[0].id.replace(/[{}]/g, "");
 
    // Step 1: Retrieve invoice amount and payment amount in parallel
    Promise.all([
        Xrm.WebApi.retrieveRecord("invoice", invoiceId, "?$select=totalamount"),
        Xrm.WebApi.retrieveRecord("axm365_payments", paymentId, "?$select=axm365_amount")
    ]).then(function (results) {
 
        var invoiceAmount = results[0]["totalamount"];
        var paymentAmount = results[1]["axm365_amount"];
 
        console.log("Invoice total: " + invoiceAmount + ", Current payment: " + paymentAmount);
 
        // Step 2: Get all existing settlements for this invoice
        var settlementQuery = "?$select=_axm365_payment_value" +
                              "&$filter=_axm365_invoice_value eq " + invoiceId;
 
        Xrm.WebApi.retrieveMultipleRecords("axm365_invoicesettelment", settlementQuery).then(
            function (settlementResult) {
 
                var existingSettlements = settlementResult.entities;
 
                if (existingSettlements.length === 0) {
                    // No previous settlements, compare directly
                    processSettlement(formContext, invoiceId, paymentId, invoiceAmount, paymentAmount, 0, closeForm);
                    return;
                }
 
                // Step 3: For each settlement, retrieve the linked payment amount
var paymentIds = existingSettlements.map(function (s) {
    return s["_axm365_payment_value"];
}).filter(function (id) {
    if (!id) return false;
    // ← normalize both sides before comparing
    var normalizedId = id.replace(/[{}]/g, "").toLowerCase();
    var normalizedCurrentId = paymentId.replace(/[{}]/g, "").toLowerCase();
    return normalizedId !== normalizedCurrentId; // exclude current payment
});
 
                if (paymentIds.length === 0) {
                    processSettlement(formContext, invoiceId, paymentId, invoiceAmount, paymentAmount, 0, closeForm);
                    return;
                }
 
                // Step 4: Retrieve all previous payment amounts
                var paymentFetches = paymentIds.map(function (pid) {
                    return Xrm.WebApi.retrieveRecord("axm365_payments", pid, "?$select=axm365_amount");
                });
 
                Promise.all(paymentFetches).then(function (paymentResults) {
 
                    // Step 5: Sum all previous payments
                    var previouslyPaid = paymentResults.reduce(function (sum, p) {
                        return sum + (p["axm365_amount"] || 0);
                    }, 0);
 
                    console.log("Previously paid: " + previouslyPaid);
 
                    processSettlement(formContext, invoiceId, paymentId, invoiceAmount, paymentAmount, previouslyPaid, closeForm);
 
                }).catch(function (error) {
                    console.error(error.message);
                    Xrm.Navigation.openAlertDialog({ text: "Error retrieving previous payment amounts: " + error.message });
                });
            },
            function (error) {
                console.error(error.message);
                Xrm.Navigation.openAlertDialog({ text: "Error retrieving existing settlements: " + error.message });
            }
        );
 
    }).catch(function (error) {
        console.error(error.message);
        Xrm.Navigation.openAlertDialog({ text: "Error retrieving amounts: " + error.message });
    });
}
 
// ─── PROCESS SETTLEMENT BASED ON AMOUNTS ─────────────────────────────────────
 
function processSettlement(formContext, invoiceId, paymentId, invoiceAmount, paymentAmount, previouslyPaid, closeForm) {
 
    var remaining = invoiceAmount - previouslyPaid;
 
    console.log("Remaining amount: " + remaining + ", Current payment: " + paymentAmount);
 
    if (paymentAmount > remaining) {
        Xrm.Navigation.openAlertDialog({
            text: "Payment amount (" + paymentAmount + ") exceeds remaining invoice balance (" + remaining + "). Settlement cannot proceed."
        });
        return;
    }
 
    var invoiceData = {};
    var paymentData = {};
 
    if (paymentAmount === remaining) {
        // ─── FULL SETTLEMENT ──────────────────────────────────────
        console.log("Full settlement");
        invoiceData = {
            statecode: 2,
            statuscode: 100001
        };
        paymentData = {
            statecode: 1,
            axm365_state: 693080002
        };
 
    } else {
        // ─── PARTIAL SETTLEMENT ───────────────────────────────────
        console.log("Partial settlement");
        invoiceData = {
            statecode: 2,
            statuscode: 100002
        };
        paymentData = {
            statecode: 1,
            axm365_state: 693080002
        };
    }
 
    // Update Invoice
    Xrm.WebApi.updateRecord("invoice", invoiceId, invoiceData).then(
        function () {
 
            // Update Payment
            Xrm.WebApi.updateRecord("axm365_payments", paymentId, paymentData).then(
                function () {
                    Xrm.Navigation.openAlertDialog({ text: "Settlement completed successfully." }).then(function () {
                        if (closeForm) {
                            formContext.ui.close();
                        } else {
                            formContext.data.refresh();
                        }
                    });
                },
                function (error) {
                    console.error(error.message);
                    Xrm.Navigation.openAlertDialog({ text: "Error updating Payment: " + error.message });
                }
            );
        },
        function (error) {
            console.error(error.message);
            Xrm.Navigation.openAlertDialog({ text: "Error updating Invoice: " + error.message });
        }
    );
}