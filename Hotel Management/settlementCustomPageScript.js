function openModalDialog (pageContext){
   
    var pageInput = {
        pageType: "custom",
        name: "axm_settlementcustompage_99501",
        entityName: pageContext.data.entity.getEntityName(),
        recordId: pageContext.data.entity.getId().replace(/[{}]/g, "").toLowerCase()
    }
 
    var navigationOptions = {
        target: 2,
        position: 2,
        height: {
            value: 100,
            unit: "%"
        },
        width: {
            value:30,
            unit: "%"
        },
        title: "Settlement"
    };
 
    Xrm.Navigation.navigateTo(pageInput, navigationOptions)
    .then(
        function(){
           
            Xrm.Navigation.openForm({
                entityName: "msdyn_journal",
                entityId: pageContext.data.entity.getId().replace(/[{}]/g, "").toLowerCase()
            });
 
 
        }
    )
    .catch(
        function(error){
            console.log(error.message);
        }
    );
 
}