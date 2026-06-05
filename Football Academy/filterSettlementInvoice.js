var SettlementForm = (function () {
 
    function onLoad(executionContext) {
        var formContext = executionContext.getFormContext();
        console.log("SettlementForm onLoad");
 
        formContext.getAttribute("axm365_invoice").addOnChange(function () {
            onInvoiceChange(formContext);
        });
 
        formContext.getAttribute("axm365_payment").addOnChange(function () {
            onPaymentChange(formContext);
        });
 
        formContext.getControl("axm365_payment").addPreSearch(function () {
            filterPaymentsByCustomer(formContext);
        });
 
        formContext.getControl("axm365_invoice").addPreSearch(function () {
            filterInvoicesByCustomer(formContext);
        });
    }
 
    function onInvoiceChange(formContext) {
        var invoice = formContext.getAttribute("axm365_invoice").getValue();
 
        if (!invoice) {
            formContext._invoiceCustomerId = null;
            return;
        }
 
        var invoiceId = invoice[0].id.replace(/[{}]/g, "");
 
        Xrm.WebApi.retrieveRecord("invoice", invoiceId, "?$select=_customerid_value").then(
            function (result) {
                var customerId = result["_customerid_value"];
                console.log("Invoice customer ID:", customerId);
 
                formContext._invoiceCustomerId = customerId;
            },
            function (error) {
                console.error("Error retrieving invoice:", error.message);
            }
        );
    }
 
    function onPaymentChange(formContext) {
        var payment = formContext.getAttribute("axm365_payment").getValue();
 
        if (!payment) {
            formContext._paymentCustomerId = null;
            return;
        }
 
        var paymentId = payment[0].id.replace(/[{}]/g, "");
 
        Xrm.WebApi.retrieveRecord("axm365_payments", paymentId, "?$select=_axm365_customer_value").then(
            function (result) {
                var customerId = result["_axm365_customer_value"];
                console.log("Payment customer ID:", customerId);
 
                formContext._paymentCustomerId = customerId;
            },
            function (error) {
                console.error("Error retrieving payment:", error.message);
            }
        );
    }
 
 
    function filterPaymentsByCustomer(formContext) {
        var customerId = formContext._invoiceCustomerId;
 
        if (!customerId) return;
 
        var filter = `
            <filter type="and">
                <condition attribute="axm365_customer" operator="eq" value="${customerId}" />
                <filter type="or">
                    <condition attribute="statuscode" operator="eq" value="1" />
                    <condition attribute="statuscode" operator="eq" value="693080001" />
                </filter>
            </filter>
        `;
 
        formContext.getControl("axm365_payment").addCustomFilter(filter);
    }
 
 
    function filterInvoicesByCustomer(formContext) {
        var customerId = formContext._paymentCustomerId;
 
        if (!customerId) return;
 
        var filter = `
            <filter type="and">
                <condition attribute="customerid" operator="eq" value="${customerId}" />
                <condition attribute="statecode" operator="eq" value="0" />
            </filter>
        `;
 
        formContext.getControl("axm365_invoice").addCustomFilter(filter);
    }
 
    return {
        onLoad: onLoad
    };
 
})();