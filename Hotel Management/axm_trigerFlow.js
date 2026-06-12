function triggerFlowFromRibbon(primaryControl) {
    try {
        var formContext = primaryControl;
        var journalId = formContext.data.entity.getId().replace(/[{}]/g, "");
 
        if (!journalId || journalId.length !== 36) {
            throw new Error("Invalid Journal ID");
        }
 
        console.log("Triggering flow for Journal ID:", journalId);
 
        triggerFlow(journalId, primaryControl);
    } catch (error) {
        console.error("Error in triggerFlowFromRibbon:", error);
        Xrm.Utility.alertDialog("Error: " + error.message);
    }
}
 
function triggerFlow(journalId, primaryControl) {
    var flowUrl = "https://prod-97.westeurope.logic.azure.com:443/workflows/ea33dd88df974c98ad3e6d38fd5b78cd/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=l8mF825t4F95q8HKSeAW0nhqNxGqZNTt2rwE-SrC-yU%22";
   
    var req = new XMLHttpRequest();
    req.open("POST", flowUrl, true);
    req.setRequestHeader("Content-Type", "application/json");
   
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 300) {
                try {
                var response = JSON.parse(req.responseText);
 
                if (response.success && response.conditionMet) {
                    console.log("Flow executed successfully. Condition met.");
                    //postJournal(primaryControl);
                    postAllJournalsForReservation(primaryControl)
                   
                } else {
                    console.log("some error")
                }
            } catch (err) {
                console.error("Failed to parse Flow response:", err);
                Xrm.Navigation.openAlertDialog({ text: "Unable to process flow response. Please check the invoice." });
            }
                     
            } else {
                Xrm.Navigation.openAlertDialog({ text: "Failed to post the journal. Please ensure the invoice is paid." });
                console.error("Flow trigger failed:", req.status, req.statusText);
            }
        }
    };
   
    req.onerror = function() {
        console.error("Network error occurred");
        Xrm.Utility.alertDialog("Network error while calling the flow");
    };
   
    try {
        req.send(JSON.stringify({
            journalId: journalId,
            timestamp: new Date().toISOString()
        }));
    } catch (e) {
        console.error("Request failed:", e);
        Xrm.Utility.alertDialog("Error preparing request: " + e.message);
    }
}
 
 
//--------
// Journals
//--------
async function postAllJournalsForReservation(primaryControl) {
    try {
        Xrm.Utility.showProgressIndicator("Posting all journals for this reservation...");
 
        var formContext = primaryControl;
        var reservation = formContext.getAttribute("axm_reservation").getValue();
        if (!reservation || reservation.length === 0) {
            throw new Error("No reservation linked to this journal.");
        }
 
        var reservationId = reservation[0].id.replace(/[{}]/g, "");
        console.log("Reservation ID:", reservationId);
 
        var fetchUrl = "?$filter=_axm_reservation_value eq " + reservationId;
        var allJournals = await Xrm.WebApi.retrieveMultipleRecords("msdyn_journal", fetchUrl);
 
        if (!allJournals.entities || allJournals.entities.length === 0) {
            throw new Error("No journals found for this reservation.");
        }
 
        var confirmStrings = {
            text: `This will post ${allJournals.entities.length} journals for this reservation. Continue?`,
            title: "Post all journals",
            confirmButtonLabel: "Yes",
            cancelButtonLabel: "No"
        };
        var confirmOptions = { height: 200, width: 450 };
        var confirmResult = await Xrm.Navigation.openConfirmDialog(confirmStrings, confirmOptions);
        if (!confirmResult.confirmed) {
            Xrm.Utility.closeProgressIndicator();
            return;
        }
 
        for (let journal of allJournals.entities) {
            await postSingleJournal(journal.msdyn_journalid);
        }
 
        Xrm.Utility.closeProgressIndicator();
        Xrm.Navigation.openAlertDialog({ text: "All journals have been successfully posted." });
 
        primaryControl.data.refresh(false);
 
    } catch (err) {
        console.error(err);
        Xrm.Utility.closeProgressIndicator();
        Xrm.Navigation.openErrorDialog({ message: err.message || "Error while posting journals." });
    }
}
 
async function postSingleJournal(journalId) {
    return new Promise((resolve, reject) => {
        var msdyn_odataRequestUrl = clientUrl + '/Webresources/msdyn_/ODataContracts/Action/msdyn_PostJournalRequest.js';
        require([configUrl], function () {
            require(['module!Common/Localization/Localization', msdyn_odataRequestUrl], function (localization, msdyn_odataRequest) {
                var request = new msdyn_odataRequest.msdyn_PostJournalRequest();
                request.entity = {
                    id: journalId,
                    entityType: "msdyn_journal"
                };
                Xrm.WebApi.online.execute(request).then(
                    function (response) {
                        resolve(response);
                    }).catch(function (error) {
                        reject(error);
                    });
            });
        });
    });
}