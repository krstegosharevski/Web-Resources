if (typeof (axm) === "undefined") {
    axm = { __namespace: true };
}
if (typeof (axm.contact) === "undefined") {
    axm.contact = { __namespace: true };
}
 
axm.contact.Event = (function () {
 
    function onLoad(primaryControl, selectedIds) {
        const formContext = primaryControl;
        const accountId = formContext.data.entity.getId();
        const companyName = formContext.getAttribute("name")?.getValue();
        const topic = formContext.getAttribute("cr05a_topic")?.getValue();
        const website = formContext.getAttribute("websiteurl")?.getValue();
        const description = formContext.getAttribute("cr05a_description")?.getValue();
        const owner = formContext.getAttribute("ownerid")?.getValue();
 
        if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
            console.warn("No contacts selected.");
            return;
        }
 
        // Show global wait notification
        Xrm.App.addGlobalNotification({
            type: 2,
            level: 3,
            message: "Creating leads, please wait...",
            showCloseButton: false
        }).then(function (notificationId) {
            let leadPromises = selectedIds.map(function (contactId) {
                const cleanedContactId = contactId.replace(/[{}]/g, "");
 
                return Xrm.WebApi.retrieveRecord("contact", contactId, "?$select=contactid,firstname,lastname,emailaddress1,jobtitle,mobilephone,telephone1")
                    .then(function (contact) {
                        //contact.contactid = cleanedContactId;
                        return createLead(contact, accountId, companyName, topic, website, description, owner);
                    });
            });
 
            Promise.allSettled(leadPromises).then(function (results) {
                Xrm.App.clearGlobalNotification(notificationId);
 
                const failed = results.filter(r => r.status === "rejected");
 
                if (failed.length === 0) {
                    Xrm.Navigation.openAlertDialog({
                        title: "Success",
                        text: "All leads were created successfully."
                    });
                } else {
                    Xrm.Navigation.openAlertDialog({
                        title: "Partial Failure",
                        text: `${failed.length} lead(s) failed to create. Check console for details.`
                    });
                    console.error("Some leads failed:", failed);
                }
            });
        });
    }
 
    function createLead(contact, accountId, companyName, topic, website, description, owner) {
        const cleanedAccountId = accountId.replace(/[{}]/g, "");
        const ownerId = owner[0].id.replace(/[{}]/g, "");
 
        const leadData = {
            subject: topic,
            firstname: contact.firstname || "",
            lastname: contact.lastname || "",
            emailaddress1: contact.emailaddress1 || "",
            jobtitle: contact.jobtitle || "",
            mobilephone: contact.mobilephone || "",
            telephone1: contact.telephone1 || "",
            companyname: companyName || "",
            websiteurl: website || "",
            description: description || "",
            "parentaccountid@odata.bind": `/accounts(${cleanedAccountId})`,
            "ownerid@odata.bind": `/systemusers(${ownerId})`,
            "customerid_account@odata.bind": `/accounts(${cleanedAccountId})`,
            "parentcontactid@odata.bind": `/contacts(${contact.contactid})`
        };
 
        return Xrm.WebApi.createRecord("lead", leadData);
    }
 
    return {
        OnLoad: onLoad
    };
})();