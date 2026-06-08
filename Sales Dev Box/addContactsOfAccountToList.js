/// low code, not in function.
 
function addContactsOfAccountToList(primaryControl) {
    var formContext = primaryControl;
    var accountId = formContext.data.entity.getId().replace("{", "").replace("}", "");
 
    Xrm.WebApi.retrieveMultipleRecords(
        "contact",
        "?$select=contactid,emailaddress1,fullname" +
        "&$filter=_parentcustomerid_value eq " + accountId + " and emailaddress1 ne null"
    ).then(
        function success(result) {
            if (result.entities.length === 0) {
                Xrm.Navigation.openAlertDialog({ text: "No contacts with email found for this Account." });
                return;
            }
 
            var lookupOptions = {
                entityTypes: ["list"],
                allowMultiSelect: false,
                defaultEntityType: "list",
                title: "Select Marketing List",
                filters: [
                    {
                        filterXml: "<filter type='and'>" +
                                   "<condition attribute='membertype' operator='eq' value='2' />" +
                                   "<condition attribute='lockstatus' operator='eq' value='0' />" +
                                   "</filter>"
                    }
                ]
            };
 
            Xrm.Utility.lookupObjects(lookupOptions).then(function(selectedItems) {
                if (!selectedItems || selectedItems.length === 0) {
                    Xrm.Navigation.openAlertDialog({ text: "No marketing list selected" });
                    return;
                }
 
                var marketingListId = selectedItems[0].id.replace("{", "").replace("}", "");
                var members = result.entities.map(function (c) {
                    return {
                        id: c.contactid,
                        entityType: "contact"
                    };
                });
 
                Marketing.MemberOperations.addListMembers([marketingListId], members, "contact")
                    .then(function () {
                        Xrm.Navigation.openAlertDialog({ text: members.length + " contacts added to Marketing List." });
                    })
                    .catch(function (error) {
                        Xrm.Navigation.openErrorDialog({ message: error.message });
                    });
 
            });
 
        },
        function error(error) {
            Xrm.Navigation.openErrorDialog({ message: error.message });
        }
    );
}
 
// advanced code in function.
 
async function addContactsOfAccountToList(primaryControl) {
    try {
 
        const formContext = primaryControl;
        const accountId = (formContext.data.entity.getId() || "").replace(/[{}]/g, "");
        if (!accountId) throw new Error("Unable to retrieve Account ID.");
 
        const contactsResult = await Xrm.WebApi.retrieveMultipleRecords(
            "contact",
            `?$select=contactid,emailaddress1,fullname&$filter=_parentcustomerid_value eq ${accountId} and emailaddress1 ne null`
        );
 
        const contacts = (contactsResult && contactsResult.entities) || [];
        if (contacts.length === 0) {
            Xrm.Utility.closeProgressIndicator();
            await Xrm.Navigation.openAlertDialog({ text: "No contacts with email found for this Account." });
            return;
        }
 
        const membersUnqMap = new Map();
        contacts.forEach(c => {
            if (c.contactid) membersUnqMap.set(c.contactid.toLowerCase(), {
                id: c.contactid,
                entityType: "contact",
                name: c.fullname || ""
            });
        });
        const members = Array.from(membersUnqMap.values());
        if (members.length === 0) {
            Xrm.Utility.closeProgressIndicator();
            await Xrm.Navigation.openAlertDialog({ text: "No valid contacts to add." });
            return;
        }
 
        const lookupOptions = {
            entityTypes: ["list"],
            allowMultiSelect: false,
            defaultEntityType: "list",
            title: "Select Marketing List",
            filters: [
                {
                    filterXml:
                        "<filter type='and'>" +
                        "<condition attribute='createdfromcode' operator='eq' value='2' />" +
                        "<condition attribute='lockstatus' operator='eq' value='0' />" +
                        "<condition attribute='type' operator='eq' value='0' />" +
                        "</filter>"
                }
            ]
        };
 
        const selected = await Xrm.Utility.lookupObjects(lookupOptions);
 
        if (!selected || selected.length === 0) {
            return;
        }
 
        const marketingListId = (selected[0].id || "").replace(/[{}]/g, "");
        if (!marketingListId) {
            throw new Error("Selected Marketing List has no id.");
        }
 
 
        if (typeof Marketing !== "undefined" && Marketing.MemberOperations && typeof Marketing.MemberOperations.addListMembers === "function") {
            await Marketing.MemberOperations.addListMembers([marketingListId], members, "contact");
            Xrm.Utility.closeProgressIndicator();
            await Xrm.Navigation.openAlertDialog({ text: `Successfully added ${members.length} contacts to the Marketing List.` });
        } else {
            Xrm.Utility.closeProgressIndicator();
            console.error("Marketing.MemberOperations.addListMembers not available in this environment.");
            await Xrm.Navigation.openAlertDialog({
                text: "Cannot add members programmatically because Marketing.MemberOperations is not available in this environment. Contact your administrator."
            });
        }
    } catch (err) {
        try { Xrm.Utility.closeProgressIndicator(); } catch (e) {}
        console.error("Error in addContactsOfAccountToList:", err);
        await Xrm.Navigation.openErrorDialog({ message: `Operation failed: ${err.message || err}` });
    }
}