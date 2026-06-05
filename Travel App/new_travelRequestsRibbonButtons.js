if (typeof axm === "undefined") {
    axm = {
        __namespace: true,
    };
}
if (typeof axm.TravelRequest === "undefined") {
    axm.TravelRequest = {
        __namespace: true,
    };
}
 
axm.TravelRequest.Event = (function () {
    async function copyTravelRequest(selectedId, primaryControl) {
        Xrm.Utility.showProgressIndicator("Copying travel request...");
 
        try {
            const recordToDuplicate = await Xrm.WebApi.retrieveRecord("new_travel_request", selectedId[0]);
            const objectToDuplicate = await composeObjectToDuplicate(recordToDuplicate);
            await createAndRefresh("new_travel_request", objectToDuplicate, primaryControl);
            Xrm.Utility.closeProgressIndicator();
        } catch (err) {
            handleError(err);
        }
    }
 
    async function composeObjectToDuplicate(inputObject) {
        let transformedObject = {};
 
        try {
            for (const key in inputObject) {
                if(inputObject[key] === null || key.startsWith("@") || key === "new_travel_requestid" || key === "new_requestid" || key === "_modifiedby_value" || key === "_createdby_value" || key === "_owninguser_value") {
                    continue;
                }
                if (!key.startsWith("_")) {
                    transformedObject[key] = inputObject[key];
                }
                if (key.startsWith("_") && !key.includes("@")) {
                    const id = inputObject[key];
                    const logicalName = inputObject[`${key}@Microsoft.Dynamics.CRM.lookuplogicalname`];
                    const associateName = inputObject[`${key}@Microsoft.Dynamics.CRM.associatednavigationproperty`];
 
                    let [lookupKey, lookupValue] = await getLookupKeyAndValue(id, logicalName, associateName);
 
                    // Edge cases
                    if (key === "_new_systemuser_value") {
                        lookupKey = "new_SystemUser@odata.bind";
                        lookupValue = `/systemusers(${id})`;
                    }
                    if (key === "_new_fortraveller_value") {
                        lookupKey = "new_Fortraveller@odata.bind";
                        lookupValue = `/systemusers(${id})`;
                    }
                    if (key === "_new_requester_value") {
                        lookupKey = "new_Requester@odata.bind";
                        lookupValue = `/systemusers(${id})`;
                    }
 
                    transformedObject[lookupKey] = lookupValue;
                }
            }
 
            // Set status to created
            transformedObject["new_status@OData.Community.Display.V1.FormattedValue"] = "Created";
            transformedObject["new_status"] = 100000000;
        }
        catch (err) {
            handleError(err);
        }
 
        return transformedObject;
    }
 
    async function getLookupKeyAndValue(id, logicalName, associateName) {
        var lookupKey, lookupValue;
 
        try {
            if(associateName) {
                const data = await fetchEntityDefinitions(logicalName, "LogicalCollectionName");
                lookupKey = `${associateName}@odata.bind`;
                lookupValue = `/${data["LogicalCollectionName"]}(${id})`;
            } else {
                const data = await fetchEntityDefinitions(logicalName, "SchemaName,LogicalCollectionName");
                lookupKey = `${data["SchemaName"]}@odata.bind`;
                lookupValue = `/${data["LogicalCollectionName"]}(${id})`;
 
            }
        }
        catch (err) {
            handleError(err);
        }
 
        return [lookupKey, lookupValue];
    }
 
    async function fetchEntityDefinitions(logicalName, selectedParams) {
        const res = await fetch(`/api/data/v9.2/EntityDefinitions(LogicalName='${logicalName}')?$select=${selectedParams}`);
        const data = await res.json();
        return data;
    }
 
    async function createAndRefresh(recordName, data, pControl) {
        try {
            var newReservation = await Xrm.WebApi.createRecord(recordName, data);
            var editStrings = {
                text: "Do you want to edit the cloned record?",
                title: "Edit record",
                subtitle: "",
                cancelButtonLabel: "Cancel",
                confirmButtonLabel: "Edit",
            };
            var editOptions = { height: 100, width: 350 };
            var editResult = await Xrm.Navigation.openConfirmDialog(editStrings, editOptions);
            await pControl.refresh();
            if (editResult.confirmed) {
                var entityFormOptions = {};
                entityFormOptions["entityName"] = recordName;
                entityFormOptions["entityId"] = newReservation.id;
                Xrm.Navigation.openForm(entityFormOptions);
            }
        } catch (err) {
            console.log(err);
        }
    };
 
    async function setTravelStatusApproved(primaryControl) {
        Xrm.Utility.showProgressIndicator("Changing status...");
 
        primaryControl.getAttribute("new_status").setValue(100000004);
 
        try {
            await primaryControl.data.save();
            Xrm.Utility.closeProgressIndicator();
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
    }
 
    async function validateAndBookTravel(primaryControl) {
        Xrm.Utility.showProgressIndicator("Changing status...");
 
        const transportType = primaryControl.getAttribute("new_transporttype").getValue();
        const needsHotel = primaryControl.getAttribute("new_needshotel").getValue();
        const needsTaxi = primaryControl.getAttribute("new_needstaxi").getValue();
 
        if (transportType && transportType != 100000000) primaryControl.getControl("new_flightnumberbooked").clearNotification("flightNumberBookedEmpty Error");
        if (!needsHotel) primaryControl.getControl("new_hotelreservation").clearNotification("hotelReservationEmpty Error");
        if (!needsTaxi) primaryControl.getControl("new_taxireservation").clearNotification("taxiReservationEmpty Error");
 
        const outStartDateEmpty = setErrorIfEmpty("new_outgoingdatetimestart", "Please enter a value.", "outStartDateEmpty Error");
        const outEndDateEmpty = setErrorIfEmpty("new_outgoingdatetimeend", "Please enter a value.", "outEndDateEmpty Error");
        const inStartDateEmpty = setErrorIfEmpty("new_incomingdatetimestart", "Please enter a value.", "inStartDateEmpty Error");
        const inEndDateEmpty = setErrorIfEmpty("new_incomingdatetimeend", "Please enter a value.", "inEndDateEmpty Error");
        const agentResponsibleEmpty = setErrorIfEmpty("new_systemuser", "Please enter a value.", "agentResponsibleEmpty Error");
 
        let flightNumberBookedEmpty = false;
        let hotelReservationEmpty = false;
        let taxiReservationEmpty = false;
 
        if (transportType == 100000000) {
            flightNumberBookedEmpty = setErrorIfEmpty(
                "new_flightnumberbooked",
                "Please enter a value. Flight number must be filled when transport type is Flight.",
                "flightNumberBookedEmpty Error"
            );
        }
 
        if (needsHotel) {
            hotelReservationEmpty = setErrorIfEmpty(
                "new_hotelreservation",
                "Please enter a value. Hotel reservation must be filled when needs hotel is selected.",
                "hotelReservationEmpty Error"
            );
        }
 
        if (needsTaxi) {
            taxiReservationEmpty = setErrorIfEmpty(
                "new_taxireservation",
                "Please enter a value. Taxi reservation must be filled when needs taxi is selected.",
                "taxiReservationEmpty Error"
            );
        }
 
        const hasError =
            outStartDateEmpty ||
            outEndDateEmpty ||
            inStartDateEmpty ||
            inEndDateEmpty ||
            agentResponsibleEmpty ||
            flightNumberBookedEmpty ||
            hotelReservationEmpty ||
            taxiReservationEmpty;
        if (!hasError) {
            primaryControl.getAttribute("new_status").setValue(100000001);
        }
 
        try {
            await primaryControl.data.save();
            Xrm.Utility.closeProgressIndicator();
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
    }
 
    async function setTravelStatusCompleted(primaryControl) {
        Xrm.Utility.showProgressIndicator("Changing status...");
 
        const entityLogicalName = "new_travel_request";
        const recordId = primaryControl.data.entity.getId();
        const data = { statecode: 1, statuscode: -1 };
        try {
            await Xrm.WebApi.updateRecord(entityLogicalName, recordId, data);
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
 
        primaryControl.getAttribute("new_status").setValue(100000002);
 
        try {
            await primaryControl.data.save();
            Xrm.Utility.closeProgressIndicator();
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
    }
 
    async function setTravelStatusCancelled(primaryControl) {
        Xrm.Utility.showProgressIndicator("Changing status...");
 
        const entityLogicalName = "new_travel_request";
        const recordId = primaryControl.data.entity.getId();
        const data = { statecode: 0, statuscode: 1 };
        try {
            await Xrm.WebApi.updateRecord(entityLogicalName, recordId, data);
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
 
        primaryControl.getAttribute("new_status").setValue(100000003);
 
        try {
            await primaryControl.data.save();
            Xrm.Utility.closeProgressIndicator();
        } catch (err) {
            Xrm.Utility.closeProgressIndicator();
            showMessageDialog("Error", err.message);
        }
    }
 
    function generateDocument(primaryControl) {
        Xrm.Utility.showProgressIndicator("Generating document...");
        getEnvironmentVariable(
            "new_GenerateDocument",
            function (url) {
                callHTTPFlowInternal(url, primaryControl);
            },
            function (error) {
                handleError(error);
            }
        );
    }
 
    function setErrorIfEmpty(fieldName, errorMessage, uniqueId) {
        const fieldValue = Xrm.Page.getAttribute(fieldName).getValue();
 
        if (!fieldValue) {
            Xrm.Page.getControl(fieldName).setNotification(errorMessage, uniqueId);
            return true;
        } else {
            Xrm.Page.getControl(fieldName).clearNotification(uniqueId);
            return false;
        }
    }
 
    function handleError(error) {
        Xrm.Utility.closeProgressIndicator();
        showMessageDialog("Error", error?.message ? error.message : "No error message available. Please check with the development team.");
    }
 
    function callHTTPFlowInternal(url, primaryControl) {
        const isExternal = primaryControl.getAttribute("new_externalemployee").getValue();
        const internalName = primaryControl.getAttribute("new_fortraveller").getValue()[0].name;
        const externalName = primaryControl.getAttribute("new_externalemployeetext").getValue();
 
        var fileName = `Налог за службено патување - ${isExternal ? externalName : internalName}.pdf`;
 
        var documentId = primaryControl.data.entity.getId();
        primaryControl.data.save().then(
            function () {
                documentId = documentId.replace("{", "").replace("}", "");
                url = url + "&id=" + documentId;
 
                fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ entityId: Xrm.Page.data.entity.getId().replace("{", "").replace("}", "") }),
                    //JSON.stringify(data)
                })
                    .then((response) => {
                        Xrm.Utility.closeProgressIndicator();
                        if (response.status == 200) {
                            response.blob().then((blob) => {
                                downloadFile(blob, fileName);
                                closePopups(primaryControl);
                            });
                        } else {
                            response.text().then((body) => {
                                handleError(body);
                            });
                        }
                    })
                    .then((data) => console.log(data))
                    .catch(function (error) {
                        handleError(error);
                    });
            },
            function (error) {
                Xrm.Utility.closeProgressIndicator();
                showMessageDialog("Error", error.message);
            }
        );
    }
 
    function closePopups(formContext) {
        formContext.data.refresh(false);
        Xrm.Utility.closeProgressIndicator();
    }
 
    function downloadFile(blob, fileName) {
        if (navigator.msSaveBlob) {
            // IE 10+
            navigator.msSaveBlob(blob, fileName);
        } else {
            var link = document.createElement("a");
            if (link.download !== undefined) {
                var url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                link.setAttribute("download", fileName);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        }
    }
 
    function showMessageDialog(messageTitle, message) {
        var alertStrings = {
            confirmButtonLabel: "OK",
            text: message,
            title: messageTitle,
        };
        var alertOptions = {
            height: 360,
            width: 920,
        };
        Xrm.Navigation.openAlertDialog(alertStrings, alertOptions);
    }
 
    function getEnvironmentVariable(varName, onSuccess, onError) {
        Xrm.WebApi.retrieveMultipleRecords(
            "environmentvariabledefinition",
            "?$select=defaultvalue,displayname&$expand=environmentvariabledefinition_environmentvariablevalue($select=value)&$filter=schemaname eq '" +
                varName +
                "'"
        ).then(
            function success(result) {
                var varValue = null;
                for (var i = 0; i < result.entities.length; i++) {
                    if (
                        typeof result.entities[i]["environmentvariabledefinition_environmentvariablevalue"] != "undefined" &&
                        result.entities[i]["environmentvariabledefinition_environmentvariablevalue"].length > 0
                    ) {
                        varValue = result.entities[i]["environmentvariabledefinition_environmentvariablevalue"][0].value;
                    } else if (typeof result.entities[i].defaultvalue != "undefined") {
                        varValue = result.entities[i].defaultvalue;
                    } else {
                        varValue = null;
                    }
                }
                onSuccess(varValue);
            },
            function (error) {
                console.log(error.message);
                onError(error);
            }
        );
    }
 
    function onLoad() {}
 
    return {
        setTravelStatusApproved: setTravelStatusApproved,
        validateAndBookTravel: validateAndBookTravel,
        setTravelStatusCompleted: setTravelStatusCompleted,
        setTravelStatusCancelled: setTravelStatusCancelled,
        generateDocument: generateDocument,
        copyTravelRequest: copyTravelRequest,
        onLoad: onLoad,
    };
})();