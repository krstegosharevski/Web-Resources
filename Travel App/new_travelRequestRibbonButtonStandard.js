var axm = axm || {};
axm.TravelRequest = axm.TravelRequest || {};

axm.TravelRequest.Event = (function () {
    "use strict";

    //#region Public Methods

    async function onLoad(executionContext) {
        try {
            const formContext = executionContext.getFormContext();

            // Initialization logic here

        } catch (error) {
            handleError(error);
        }
    }

    async function copyTravelRequest(selectedIds, primaryControl) {
        try {
            Xrm.Utility.showProgressIndicator("Copying travel request...");

            // Business logic

            Xrm.Utility.closeProgressIndicator();
        } catch (error) {
            handleError(error);
        }
    }

    async function validateAndBookTravel(primaryControl) {
        try {
            Xrm.Utility.showProgressIndicator("Changing status...");

            // Validation logic

            await primaryControl.data.save();

            Xrm.Utility.closeProgressIndicator();
        } catch (error) {
            handleError(error);
        }
    }

    async function setTravelStatusApproved(primaryControl) {
        updateStatus(primaryControl, 100000004);
    }

    async function setTravelStatusCompleted(primaryControl) {
        updateStatus(primaryControl, 100000002);
    }

    async function setTravelStatusCancelled(primaryControl) {
        updateStatus(primaryControl, 100000003);
    }

    function generateDocument(primaryControl) {
        try {
            Xrm.Utility.showProgressIndicator("Generating document...");

            // Document generation logic

        } catch (error) {
            handleError(error);
        }
    }

    //#endregion

    //#region Private Methods

    async function updateStatus(primaryControl, statusValue) {
        try {
            Xrm.Utility.showProgressIndicator("Updating status...");

            primaryControl.getAttribute("new_status").setValue(statusValue);

            await primaryControl.data.save();

            Xrm.Utility.closeProgressIndicator();
        } catch (error) {
            handleError(error);
        }
    }

    async function createRecord(entityName, data) {
        return await Xrm.WebApi.createRecord(entityName, data);
    }

    async function retrieveRecord(entityName, recordId) {
        return await Xrm.WebApi.retrieveRecord(entityName, recordId);
    }

    async function updateRecord(entityName, recordId, data) {
        return await Xrm.WebApi.updateRecord(entityName, recordId, data);
    }

    function showMessageDialog(title, message) {
        Xrm.Navigation.openAlertDialog({
            title: title,
            text: message,
            confirmButtonLabel: "OK"
        });
    }

    function handleError(error) {
        Xrm.Utility.closeProgressIndicator();

        showMessageDialog(
            "Error",
            error?.message || "Unexpected error occurred."
        );

        console.error(error);
    }

    //#endregion

    return {
        onLoad: onLoad,
        copyTravelRequest: copyTravelRequest,
        validateAndBookTravel: validateAndBookTravel,
        setTravelStatusApproved: setTravelStatusApproved,
        setTravelStatusCompleted: setTravelStatusCompleted,
        setTravelStatusCancelled: setTravelStatusCancelled,
        generateDocument: generateDocument
    };

})();