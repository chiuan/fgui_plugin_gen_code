"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const csharp_1 = require("csharp");
const CodeWriter_1 = require("./CodeWriter");
class GenClassInfo {
    constructor(name, varName, supertype, customtype) {
        this.name = name;
        this.varName = varName;
        this.supertype = supertype;
        this.customType = customtype;
    }
}
let exportLangKV = new Map();
function genCodeTs(handler) {
    let settings = handler.project.GetSettings("Publish").codeGeneration;
    let codePkgName = handler.ToFilename(handler.pkg.name); //convert chinese to pinyin, remove special chars etc.
    let exportCodePath = handler.exportCodePath + '/' + codePkgName;
    //CollectClasses(stripeMemeber, stripeClass, fguiNamespace)
    let classes = handler.CollectClasses(settings.ignoreNoname, settings.ignoreNoname, null);
    handler.SetupCodeFolder(exportCodePath, "ts"); //check if target folder exists, and delete old files
    let getMemberByName = settings.getMemberByName;
    let classCnt = classes.Count;
    let writer = new CodeWriter_1.default();
    let exportClassList = new Array();
    // 一个个导出类导出
    for (let i = 0; i < classCnt; i++) {
        let classInfo = classes.get_Item(i);
        if (!checkPackageItemIsGenCode(handler, classInfo.res)) {
            // console.warn("不需要导出:" + classInfo.resName)
            continue;
        }
        else {
            console.log("导出:" + classInfo.resName);
        }
        logClassInfo(classInfo);
        // 需要绑定的组件变量
        let genClassTypeMap = new Map();
        // 需要多语言转义的变量
        let langTypeMap = new Map();
        let members = classInfo.members;
        writer.reset();
        writer.writeln('import { FairyGUI } from \'csharp\';');
        writer.writeln('import { BaseUI } from "../../../framework/ui/BaseUI";');
        writer.writeln();
        // 提前先获取一次生成组件变量存在引用的生成代码或者跨包的生成代码类.
        for (let index = 0; index < classInfo.members?.Count; index++) {
            const element = classInfo.members.get_Item(index);
            console.log("       > " + element.name + " -v:" + element.varName + " -t:" + element.type);
            if (element.res) {
                let desc = handler.GetItemDesc(element.res);
                let superClassName = desc?.GetAttribute("extention");
                // 是一个自定义组件
                console.log("           : res=" + element.res.name + " 包名:" + element.res.owner.name + " -t:" + element.res.type
                    + " -t2:" + superClassName);
                // 如果是当前的包那么直接发布
                // 如果是其他包。那么需要判断这个是否需要生成代码的，否则也是直接当成是component组件引用
                if (element.res.owner.name == handler.pkg.name) {
                    // 判断是否需要导出生成代码类否则直接生成扩展类吧
                    if (checkPackageItemIsGenCode(handler, element.res) && element.res.exported) {
                        // 生成BaseUI类
                        let className = "Gen_" + element.res.name;
                        writer.writeln('import { %s } from "./%s";', className, className);
                    }
                    else {
                        // 生成绑定ext类
                    }
                }
                else {
                    // 不在同一个包，需要读取目标路径的配置xml判断是否需要生成
                    if (checkOtherPackageItemIsGenCode(element.res)) {
                        // console.log("引用其他包的资源可以生成代码:" + element.res.owner.name + "." + element.res.name)
                        let className = "Gen_" + element.res.name;
                        writer.writeln('import { %s } from "../%s/%s";', className, element.res.owner.name, className);
                    }
                }
            }
        }
        // classInfo.superClassName = GComponent GButton这种
        writer.writeln();
        writer.writeln('export class %s extends BaseUI', classInfo.className);
        writer.startBlock();
        writer.writeln();
        // 写一下这个界面的常量
        writer.writeln('public readonly URL_ID:string = "ui://%s%s";', handler.pkg.id, classInfo.resId);
        // writer.writeln('public readonly URL:string = "ui://%s/%s";', handler.pkg.name, classInfo.resName);
        writer.writeln();
        // 组件变量
        for (let index = 0; index < classInfo.members?.Count; index++) {
            const element = classInfo.members.get_Item(index);
            if (element.res) {
                // 如果是当前的包那么直接发布
                // 如果是其他包。那么需要判断这个是否需要生成代码的，否则也是直接当成是component组件引用
                if (element.res.owner.name == handler.pkg.name) {
                    // 判断是否需要导出生成代码类否则直接生成扩展类吧
                    // 只有当这个组件资源里面勾选了生成代码 + exported才生成代码
                    if (checkPackageItemIsGenCode(handler, element.res) && element.res.exported) {
                        // 生成BaseUI类
                        let className = "Gen_" + element.res.name;
                        writer.writeln('%s : %s', element.varName, className);
                        genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, className, true));
                    }
                    // 通过判断在该组件是否勾选了导出，那么也需要生成一下ext类
                    else {
                        let desc = handler.GetItemDesc(element.res);
                        let superClassName = desc?.GetAttribute("extention");
                        if (!superClassName) {
                            // null = GComponent
                            writer.writeln('%s : FairyGUI.GComponent', element.varName);
                            genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, "GComponent", false));
                            // 如果有title的可以?
                            if (checkPackageItemIsLang(handler, classInfo.res, element.name)) {
                                langTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, superClassName, false));
                            }
                        }
                        else {
                            writer.writeln('%s : FairyGUI.G%s', element.varName, superClassName);
                            genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, "G" + superClassName, false));
                            if (checkPackageItemIsLang(handler, classInfo.res, element.name)) {
                                langTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, "G" + superClassName, false));
                            }
                        }
                    }
                }
                else {
                    // 不在同一个包，需要读取目标路径的配置xml判断是否需要生成
                    if (checkOtherPackageItemIsGenCode(element.res)) {
                        // console.log("引用其他包的资源可以生成代码:" + element.res.owner.name + "." + element.res.name)
                        let className = "Gen_" + element.res.name;
                        writer.writeln('%s : %s', element.varName, className);
                        genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, className, true));
                    }
                    else {
                        let superClassName = checkOtherPackageItemExtension(element.res);
                        if (superClassName) {
                            writer.writeln('%s : FairyGUI.G%s', element.varName, superClassName);
                            genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, "G" + superClassName, false));
                            if (checkPackageItemIsLang(handler, classInfo.res, element.name)) {
                                langTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, "G" + superClassName, false));
                            }
                        }
                    }
                }
            }
            else {
                // fgui 默认的组件变量即可
                writer.writeln('%s : FairyGUI.%s', element.varName, element.type);
                genClassTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, element.type, false));
                if (checkPackageItemIsLang(handler, classInfo.res, element.name)) {
                    langTypeMap.set(element.varName, new GenClassInfo(element.name, element.varName, element.type, false));
                }
            }
        }
        writer.writeln();
        // 构造函数
        writer.writeln('constructor()');
        writer.startBlock();
        writer.writeln('super()');
        // writer.writeln('this.layerName = UILayer.Normal')
        writer.writeln('this.packageName = "%s"', handler.pkg.name);
        writer.writeln('this.componentName = "%s";', classInfo.resName);
        writer.endBlock();
        writer.writeln();
        writer.writeln('public bindAll(com: FairyGUI.GComponent): any');
        writer.startBlock();
        // 开始绑定组件get
        genClassTypeMap.forEach((v, k) => {
            if (v.customType) {
                writer.writeln("this." + k + " = new %s().bindAll(com.GetChild('%s')?.asCom)", v.supertype, v.name);
            }
            else {
                if (v.supertype == "Controller") {
                    writer.writeln("this." + k + " = com.GetController('%s')", v.name);
                }
                else if (v.supertype == "Transition") {
                    writer.writeln("this." + k + " = com.GetTransition('%s')", v.name);
                }
                else {
                    writer.writeln("this." + k + " = com.GetChild('%s') as FairyGUI.%s", v.name, v.supertype);
                }
            }
        });
        // 开始写多语言的组件绑定
        writer.writeln();
        writer.writeln('if(!this.useLang) return this');
        writer.writeln();
        // 多语言组件绑定
        langTypeMap.forEach((v, k) => {
            if (v.supertype == "GLoader") {
                writer.writeln('this.' + k + ".url = this.getLangText('%s')", handler.pkg.name + "." + classInfo.resName + "." + v.name);
            }
            else if (v.supertype == "GTextField") {
                writer.writeln('this.' + k + ".text = this.getLangText('%s')", handler.pkg.name + "." + classInfo.resName + "." + v.name);
            }
            else if (v.supertype == "GRichTextField") {
                writer.writeln('this.' + k + ".text = this.getLangText('%s')", handler.pkg.name + "." + classInfo.resName + "." + v.name);
            }
            else if (v.supertype == "Button" || v.supertype == "Label" || v.supertype == "GButton" || v.supertype == "GLabel") {
                writer.writeln('this.' + k + ".title = this.getLangText('%s')", handler.pkg.name + "." + classInfo.resName + "." + v.name);
            }
        });
        writer.writeln();
        writer.writeln('return this');
        writer.endBlock();
        writer.writeln();
        writer.writeln('public onAwake(...args: any): void {}');
        writer.writeln();
        writer.writeln('public onShow(...args: any): void {}');
        writer.writeln();
        writer.writeln('public onClose(...args: any): void {}');
        writer.writeln();
        writer.endBlock();
        writer.save(exportCodePath + '/' + classInfo.className + '.ts');
        exportClassList.push(classInfo.className);
    }
    writer.reset();
    // 写一个binder类可以直接获取这个package导出的信息
    // 如果有些组件需要绑定的也可以绑定这个组件类型
    // let binderName = "GenMain_" + codePkgName;
    // writer.writeln('export class %s', binderName)
    // writer.startBlock()
    // writer.writeln()
    // writer.writeln('public static PackageName:string = "%s";', handler.pkg.name)
    // writer.writeln()
    // // 把这个包导出的类记录一下引用的类名
    // // bindall扩展类绑定
    // writer.writeln('public static bindAll()');
    // writer.startBlock();
    // // for (let i: number = 0; i < classCnt; i++) {
    // //     let classInfo = classes.get_Item(i);
    // //     writer.writeln('UIObjectFactory.SetPackageItemExtension(%s.URL, typeof(%s));', classInfo.className, classInfo.className);
    // // }
    // writer.endBlock(); //bindall
    // writer.endBlock()
    // writer.save(exportCodePath + '/' + binderName + '.ts');
    writer.reset();
    // 把该包多语言的kv保存下来
    if (exportLangKV.size > 0) {
        exportLangKV.forEach((v, k) => {
            writer.writeln("%s  %s", k, v);
        });
        writer.save(exportCodePath + '/' + "lang_" + codePkgName + '.txt');
    }
    writer.reset();
}
exports.genCodeTs = genCodeTs;
function genBindClass(handler, pkgItem) {
    let writer = new CodeWriter_1.default();
    // if (!checkPackageItemIsGenCode(handler, pkgItem)) {
    //     return
    // } else {
    //     console.log("导出:" + pkgItem.name)
    // }
    writer.reset();
    writer.writeln('import { FairyGUI } from \'csharp\';');
    writer.writeln('import { binder } from \'framework/common/NiceDecorator\';');
    writer.writeln('import { BaseUI, UILayer } from "../../../framework/ui/BaseUI";');
    writer.writeln();
    pkgItem = handler.pkg.GetItem(pkgItem.id);
    console.log(pkgItem.name + " - " + pkgItem.file);
    console.log(pkgItem.GetURL());
    let pkg = pkgItem.GetTrunk();
    // 提前先获取一次生成组件变量存在引用的生成代码或者跨包的生成代码类.
    for (let index = 0; index < pkg.children.Count; index++) {
        const child = pkg.children.get_Item(index);
        console.log("child : " + child.name);
    }
}
function checkPackageItemIsLang(handler, pkgItem, refComponentName) {
    // console.log("found lang  = " + refComponentName)
    let file = csharp_1.System.IO.File.ReadAllText(pkgItem.file);
    let xml = new csharp_1.FairyGUI.Utils.XML(file);
    let sd = xml?.GetNode("scriptData");
    if (!sd) {
        return false;
    }
    let eles = xml?.GetNode("displayList")?.Elements();
    for (let index = 0; index < eles?.Count; index++) {
        const element = eles.get_Item(index);
        if (element.GetAttribute("name") == refComponentName) {
            // 获取这个组件id
            let id = element.GetAttribute("id");
            // 然后跑去找这个配置的lang是否是1
            if (sd.GetAttribute("lang" + id) == "1") {
                let key = handler.pkg.name + "." + pkgItem.name + "." + refComponentName;
                // 保存一下这个多语言的key - text
                if (element.HasAttribute("text")) {
                    exportLangKV.set(key, element.GetAttribute("text"));
                }
                else if (element.HasAttribute("url")) {
                    exportLangKV.set(key, element.GetAttribute("url"));
                }
                else if (element.GetNode("Button")?.HasAttribute("title")) {
                    exportLangKV.set(key, element.GetNode("Button").GetAttribute("title"));
                }
                else if (element.GetNode("Label")?.HasAttribute("title")) {
                    exportLangKV.set(key, element.GetNode("Label").GetAttribute("title"));
                }
                return true;
            }
            else {
                return false;
            }
        }
    }
    return false;
}
function checkPackageItemIsGenCode(handler, pkgItem) {
    let xml = handler.GetScriptData(pkgItem);
    let gencode = xml?.GetAttribute("gencode" + pkgItem.id);
    if (gencode == "1") {
        return true;
    }
    return false;
}
// 例如一个组件里面选择了某个丢进来的组件勾选了生成代码，但是这个组件不生成实例化代码就用ext
function checkComponentIsGenCode(handler, pkgItem, refComponentId) {
    let xml = handler.GetScriptData(pkgItem);
    let gencode = xml?.GetAttribute("gencode" + refComponentId);
    if (gencode == "1") {
        return true;
    }
    return false;
}
function checkOtherPackageItemIsGenCode(pkgItem) {
    let file = csharp_1.System.IO.File.ReadAllText(pkgItem.file);
    let xml = new csharp_1.FairyGUI.Utils.XML(file);
    let gencode = xml?.GetNode("scriptData")?.GetAttribute("gencode" + pkgItem.id);
    if (gencode == "1") {
        return true;
    }
    return false;
}
function checkOtherPackageItemExtension(pkgItem) {
    let file = csharp_1.System.IO.File.ReadAllText(pkgItem.file);
    let xml = new csharp_1.FairyGUI.Utils.XML(file);
    return xml?.GetAttribute("extention");
}
function logClassInfo(ci) {
    console.log(ci.superClassName + "." + ci.className + " resName=" + ci.resName + " resId=" + ci.resId);
    // for (let index = 0; index < ci.members?.Count; index++) {
    //     const element = ci.members.get_Item(index);
    //     console.log("       > " + element.name + " -v:" + element.varName + " -t:" + element.type )
    //     if(element.res) {
    //         console.log("           : res=" + element.res.name + " 包名:" + element.res.owner.name)
    //     }
    // }
    for (let index = 0; index < ci.references?.Count; index++) {
        const element = ci.references.get_Item(index);
        console.log("           >> ref:" + element);
    }
}
