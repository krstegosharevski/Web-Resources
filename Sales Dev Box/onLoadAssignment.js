async function updateAssignedDate(executionContext) {
  const formContext = executionContext.getFormContext();
  const acctId = formContext.data.entity.getId().replace(/[{}]/g, "");
  const dateValue = formContext.getAttribute("new_assigneddate").getValue(); // може null
 
  if (!acctId) {
    Xrm.Navigation.openAlertDialog({ text: "Account ID not found." });
    return;
  }
 

  const entity = {};
  entity["new_assigneddate"] = dateValue;
 
  try {
    await Xrm.WebApi.updateRecord("account", acctId, entity);
    Xrm.Navigation.openAlertDialog({ text: "Assigned Date updated successfully." });
  } catch (err) {
    Xrm.Navigation.openErrorDialog({ message: "Update failed: " + err.message });
  }
}