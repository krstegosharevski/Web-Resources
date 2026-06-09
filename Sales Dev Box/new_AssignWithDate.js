async function openAssignDialog(primaryControl) {
    let selectedRecords = [];
 
    if (primaryControl.getSelectedRows) {
        const rows = primaryControl.getSelectedRows();
        if (rows.getLength() === 0) {
            await Xrm.Navigation.openAlertDialog({ text: "Please select at least one account." });
            return;
        }
        rows.forEach(r => {
            const entityRef = r.getData?.().entity ?? r.getEntity?.();
            if (entityRef) selectedRecords.push(entityRef.getId().replace(/[{}]/g, ""));
        });
    } else if (primaryControl.data && primaryControl.data.entity) {
        const recordId = primaryControl.data.entity.getId();
        if (recordId) selectedRecords.push(recordId.replace(/[{}]/g, ""));
    } else {
        await Xrm.Navigation.openAlertDialog({ text: "No valid record context found." });
        return;
    }
 
    if (selectedRecords.length === 0) {
        await Xrm.Navigation.openAlertDialog({ text: "No valid Account records found." });
        return;
    }
 
    const pageInput = {
        pageType: "webresource",
        webresourceName: "new_AssignDialog.html",
        data: JSON.stringify({ selectedRecords })
    };
 
    const navigationOptions = {
        target: 2,
        width: { value: 400, unit: "px" },
        height: { value: 300, unit: "px" },
        position: 1
    };
 
    try {
        const result = await Xrm.Navigation.navigateTo(pageInput, navigationOptions);
        if (result && result.assignedDate && result.assignToId) {
            for (const recordId of selectedRecords) {
                await assignRecord(recordId, result.assignToId, result.assignToType);
                await Xrm.WebApi.updateRecord("account", recordId, { "new_assigneddate": result.assignedDate });
            }
            await Xrm.Navigation.openAlertDialog({ text: "Accounts successfully assigned." });
        }
    } catch (err) {
        console.error(err);
        await Xrm.Navigation.openErrorDialog({ message: err.message });
    }
}
 
async function assignRecord(recordId, toId, toType) {
    const assignRequest = {
        "Target": { "id": recordId, "entityType": "account" },
        "Assignee": { "id": toId, "entityType": toType },
        "getMetadata": function () {
            return {
                boundParameter: null,
                parameterTypes: {
                    "Target": { typeName: "mscrm.crmbaseentity", structuralProperty: 5 },
                    "Assignee": { typeName: "mscrm.principal", structuralProperty: 5 }
                },
                operationType: 0,
                operationName: "Assign"
            };
        }
    };
    await Xrm.WebApi.execute(assignRequest);
}