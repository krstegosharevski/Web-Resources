function settleInvoice(formContext, closeForm) {
 
    var payment = formContext.getAttribute("axm365_payment").getValue();
    var invoice = formContext.getAttribute("axm365_invoice").getValue();
 
    if (!payment || !invoice) {
        Xrm.Navigation.openAlertDialog({ text: "Please select both Payment and Invoice." });
        return;
    }
 
    var paymentId = payment[0].id.replace("{", "").replace("}", "");
    var invoiceId = invoice[0].id.replace("{", "").replace("}", "");
 
    var invoiceData = {
        statecode: 2,
    };
 
    var paymentData = {
        statecode: 1,
        axm365_state: 693080002// change this
    };
 
    Xrm.WebApi.updateRecord("invoice", invoiceId, invoiceData).then(
        function success() {
 
            Xrm.WebApi.updateRecord("axm365_payments", paymentId, paymentData).then(
                function success2() {
 
                    Xrm.Navigation.openAlertDialog({ text: "Settlement completed successfully." });
 
                    if (closeForm) {
                        formContext.ui.close();
                    } else {
                        formContext.data.refresh();
                    }
                },
                function (error) {
                    console.error(error.message);
                    Xrm.Navigation.openAlertDialog({ text: "Error updating Payment." });
                }
            );
 
        },
        function (error) {
            console.error(error.message);
            Xrm.Navigation.openAlertDialog({ text: "Error updating Invoice." });
        }
    );
}