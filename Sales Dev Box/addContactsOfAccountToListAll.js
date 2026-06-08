async function addContactsOfSelectedAccountsToList(SelectedControl) {
    try {
        const grid = SelectedControl.getGrid ? SelectedControl.getGrid() : null;
        if (!grid) {
            await Xrm.Navigation.openAlertDialog({ text: "Unable to access the grid control." });
            return;
        }
 
        const selectedRows = grid.getSelectedRows();
        if (!selectedRows || selectedRows.getLength() === 0) {
            await Xrm.Navigation.openAlertDialog({ text: "Please select at least one Account." });
            return;
        }
 
        const accountIds = [];
        selectedRows.forEach(row => {
            const entity = row.getData().getEntity();
            const id = entity.getId().replace(/[{}]/g, "");
            accountIds.push(id);
        });
 
        console.log("Selected Accounts:", accountIds);
 
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
 
        const selectedList = await Xrm.Utility.lookupObjects(lookupOptions);
        if (!selectedList || selectedList.length === 0) return;
 
        const marketingListId = selectedList[0].id.replace(/[{}]/g, "");
 
        let totalAdded = 0;
        for (const accountId of accountIds) {
            const contactsResult = await Xrm.WebApi.retrieveMultipleRecords(
                "contact",
                `?$select=contactid,emailaddress1,fullname&$filter=_parentcustomerid_value eq ${accountId} and emailaddress1 ne null`
            );
 
            const contacts = contactsResult.entities || [];
            if (contacts.length === 0) continue;
 
            const members = contacts.map(c => ({
                id: c.contactid,
                entityType: "contact",
                name: c.fullname || ""
            }));
 
            if (typeof Marketing !== "undefined" && Marketing.MemberOperations?.addListMembers) {
                await Marketing.MemberOperations.addListMembers([marketingListId], members, "contact");
                totalAdded += members.length;
            }
        }
 
        await Xrm.Navigation.openAlertDialog({
            text: `Successfully added ${totalAdded} contacts from ${accountIds.length} account(s) to the selected Marketing List.`
        });
 
    } catch (err) {
        console.error("Error in addContactsOfSelectedAccountsToList:", err);
        await Xrm.Navigation.openErrorDialog({
            message: `Operation failed: ${err.message || err}`
        });
    }
}