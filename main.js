"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csharp_1 = require("csharp");
const GenCode_CSharp_1 = require("./GenCode_CSharp");
const App = csharp_1.FairyEditor.App;
App.pluginManager.LoadUIPackage(App.pluginManager.basePath + "/" + eval("__dirname") + '/CustomInspector');
class ExportCodeFlagInspector extends csharp_1.FairyEditor.View.PluginInspector {
    constructor() {
        super();
        this.panel = csharp_1.FairyGUI.UIPackage.CreateObject("CustomInspector", "ExportCodeFlag").asCom;
        this.ctrl_ref = this.panel.GetController("ref");
        this.combo = this.panel.GetChild("check").asButton;
        this.combo.onChanged.Add(() => {
            let obj = App.activeDoc.inspectingTarget;
            //use obj.docElement.SetProperty('xxx',..) instead of obj.xxx = ... to enable undo/redo mechanism
            // obj.docElement.SetProperty("customData", this.combo.value)
            // console.log("set gencode:" + obj._res.packageItem.id)
            if (obj.docElement.isRoot) {
                obj.docElement.SetScriptData("gencode" + obj._res.packageItem.id, this.combo.selected ? "1" : "0");
            }
            else {
                obj.parent.docElement.SetScriptData("gencode" + obj._res.packageItem.id, this.combo.selected ? "1" : "0");
            }
        });
        this.updateAction = () => { return this.updateUI(); };
    }
    updateUI() {
        let sels = App.activeDoc.inspectingTargets;
        let obj = sels.get_Item(0);
        this.ctrl_ref.SetSelectedPage("false");
        if (obj.docElement.isRoot) {
            this.combo.selected = obj.scriptData.GetAttribute("gencode" + obj._res.packageItem.id) == "1";
        }
        else {
            this.combo.selected = obj.parent.scriptData.GetAttribute("gencode" + obj._res.packageItem.id) == "1";
            this.ctrl_ref.SetSelectedPage("true");
            // if (obj._pkg.name != obj.parent.pkg.name) {
            //     this.ctrl_ref.SetSelectedPage("true")
            // } else {
            //     this.ctrl_ref.SetSelectedPage("false")
            // }
        }
        // console.log("current gencode " + obj._res.packageItem.id + " : " + this.combo.selected)
        return true; //if everything is ok, return false to hide the inspector
    }
}
//Register a inspector
App.inspectorView.AddInspector(() => new ExportCodeFlagInspector(), "GenCodeFlag", "标记是否生成代码");
//Condition to show it
//App.docFactory.ConnectInspector("GenCodeFlag", "mixed", true, false);
App.docFactory.ConnectInspector("GenCodeFlag", "component", false, false);
App.docFactory.ConnectInspector("GenCodeFlag", "component", true, false);
class LangFlagInspector extends csharp_1.FairyEditor.View.PluginInspector {
    constructor() {
        super();
        this.panel = csharp_1.FairyGUI.UIPackage.CreateObject("CustomInspector", "LangFlag").asCom;
        this.combo = this.panel.GetChild("check").asButton;
        this.combo.onChanged.Add(() => {
            let obj = App.activeDoc.inspectingTarget;
            //use obj.docElement.SetProperty('xxx',..) instead of obj.xxx = ... to enable undo/redo mechanism
            // obj.docElement.SetProperty("customData", this.combo.value)
            console.log("set lang:" + obj.id);
            if (obj.docElement.isRoot) {
                obj.docElement.SetScriptData("lang" + obj.id, this.combo.selected ? "1" : "0");
            }
            else {
                obj.parent.docElement.SetScriptData("lang" + obj.id, this.combo.selected ? "1" : "0");
            }
        });
        this.updateAction = () => { return this.updateUI(); };
    }
    updateUI() {
        let sels = App.activeDoc.inspectingTargets;
        let obj = sels.get_Item(0);
        // console.log(obj.objectType)
        if (obj.objectType == "component") {
            let ext = checkOtherPackageItemSuperClassType(obj._res.packageItem);
            // console.log(ext)
            if (!(ext == "Button" || ext == "Label")) {
                return false;
            }
        }
        else if (!(obj.objectType == "loader" || obj.objectType == "text" || obj.objectType == "richtext")) {
            return false;
        }
        console.log("lang" + obj.id);
        if (obj.docElement.isRoot) {
            this.combo.selected = obj.scriptData.GetAttribute("lang" + obj.id) == "1";
        }
        else {
            this.combo.selected = obj.parent.scriptData.GetAttribute("lang" + obj.id) == "1";
        }
        return true; //if everything is ok, return false to hide the inspector
    }
}
function checkOtherPackageItemSuperClassType(pkgItem) {
    let file = csharp_1.System.IO.File.ReadAllText(pkgItem.file);
    let xml = new csharp_1.FairyGUI.Utils.XML(file);
    let ext = xml?.GetAttribute("extention");
    return ext;
}
//Register a inspector
App.inspectorView.AddInspector(() => new LangFlagInspector(), "LangFlag", "标记是否多语言对象");
//Condition to show it
App.docFactory.ConnectInspector("LangFlag", "mixed", false, false);
App.docFactory.ConnectInspector("LangFlag", "loader", false, false);
App.docFactory.ConnectInspector("LangFlag", "text", false, false);
App.docFactory.ConnectInspector("LangFlag", "richtext", false, false);
// -------------------开始生成代码----------------------------
function onPublish(handler) {
    if (!handler.genCode)
        return;
    handler.genCode = false; //prevent default output
    console.log('开始生成代码');
    // genCodeTs(handler); 
    GenCode_CSharp_1.genCodeCS(handler);
}
exports.onPublish = onPublish;
function onDestroy() {
    //do cleanup here
}
exports.onDestroy = onDestroy;
