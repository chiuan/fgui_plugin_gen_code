import { FairyGUI } from 'csharp';
import { S } from 'global/GameConfig';
import { Singleton } from '../common/Singleton';
import { BaseUI, UIClass } from './BaseUI';


class UIPageTrack {
    public pkg: string;
    public name: string;
    public arg: any;
}


export class UIManager extends Singleton<UIManager>{

    private isInit: boolean;
    private uiRoot: FairyGUI.GComponent;
    private uiList: BaseUI[] = [];
    private uiQueue: Map<string, BaseUI[]> = new Map<string, BaseUI[]>()

    // 临时可能用来构造实例加载之类的用
    private _uiClassInstance: BaseUI[] = [];

    constructor() {
        super();
    }

    /**
     * 初始化fairyGUI的层级和展示对象到场景
     */
    public async init() {
        if (this.isInit) return
        this.isInit = true

        // 必须先生成界面打开需要的层级
        await S.ResManager.loadFairyGUIPackage("loading_fui.bytes", "loading")
        this.uiRoot = FairyGUI.UIPackage.CreateObject("loading", "UIRoot").asCom;
        FairyGUI.GRoot.inst.AddChild(this.uiRoot);
    }

    private _getOrCreateUI<T extends BaseUI>(uiClass: UIClass<T>): BaseUI {
        for (let i = 0; i < this._uiClassInstance.length; ++i) {
            if (this._uiClassInstance[i].tag === uiClass) {
                return this._uiClassInstance[i];
            }
        }

        let tempUI = new uiClass() as BaseUI
        this._uiClassInstance.push(tempUI)

        return tempUI;
    }

    /**
     * 获取某个UI层级对象
     * @param name 层级对象名称
     */
    public getLayer(name: string): FairyGUI.GComponent {
        return this.uiRoot.GetChild(name).asCom;
    }

    public getUI<T extends BaseUI>(uiClass: UIClass<T>): BaseUI {
        for (let i = 0; i < this.uiList.length; ++i) {
            if (this.uiList[i].tag === uiClass) {
                return this.uiList[i];
            }
        }
        return null;
    }

    public checkInstanceIsActive(ui: BaseUI): boolean {
        return ui && ui.getView()?.visible && ui.getView().onStage
    }

    public checkIsActive<T extends BaseUI>(uiClass: UIClass<T>): boolean {
        let com = this.getUI(uiClass)
        if (com && com.getView()?.visible && com.getView().onStage) {
            return true
        }
        return false
    }

    private moveQueueUIToTop(ui: BaseUI) {
        if (ui?.queue) {
            if (this.uiQueue.has(ui.queue)) {
                let exists = this.uiQueue.get(ui.queue)
                let existIndex = exists.findIndex((v) => {
                    return v === ui
                })
                if (existIndex != -1) {
                    exists.splice(existIndex, 1)
                }
                let newLen = exists.push(ui)

                // 先把这个位置之前的都关闭掉!
                for (let index = 0; index < newLen - 1; index++) {
                    const oldUI = exists[index];
                    // ! 注意这里不能自动触发打开queue队列里面的ui
                    // ! 这里因为会打开新的，所以老的关闭不播放关闭动画直接关闭
                    oldUI.setupAnimation(false)

                    // this.closeUI(oldUI.tag, false)
                }
            } else {
                this.uiQueue.set(ui.queue, new Array<BaseUI>(ui))
            }
        }
    }

    private checkQueueExistUIBefore(ui: BaseUI): boolean {
        if (ui?.queue) {
            if (this.uiQueue.has(ui.queue)) {
                let exists = this.uiQueue.get(ui.queue)
                let existIndex = exists.findIndex((v) => {
                    return v === ui
                })
                let preIndex = existIndex - 1
                if (preIndex >= 0 && preIndex < exists.length) {
                    return true
                }
            }
        }

        return false
    }

    private popQueueUI(ui: BaseUI) {
        if (ui?.queue) {
            if (this.uiQueue.has(ui.queue)) {
                let exists = this.uiQueue.get(ui.queue)
                let existIndex = exists.findIndex((v) => {
                    return v === ui
                })
                if (existIndex != -1) {
                    exists.splice(existIndex, 1)
                }
                let preIndex = existIndex - 1
                if (preIndex >= 0 && preIndex < exists.length) {
                    let preUI = exists[preIndex]
                    // ! 确保打开前这个类型没有在队列里面了避免同一个类型的重复添加
                    exists.splice(preIndex, 1)

                    // ! 这里因为会打开新的，所以老的关闭不播放关闭动画直接打开
                    let oldShowAnimation = false
                    this.showUI(preUI.tag, preUI.uiInstanceArgs, false, preUI.queue, oldShowAnimation)
                }
            }
        }
    }

    // 只负责清理当前ui以及这个uiqueue的整条队列记录
    public clearQueueUI(queue: string, closeAllQueueUI: boolean) {
        if (queue) {
            if (closeAllQueueUI && this.uiQueue.has(queue)) {
                let exists = this.uiQueue.get(queue)
                for (let index = 0; index < exists?.length; index++) {
                    const element = exists[index];
                    this.closeUI(element.tag, false)
                }
            }

            this.uiQueue.delete(queue)
        }
    }

    // 获取uiqueue信息,便于判断当前uiqueue是否已经显示完毕
    public getUIqueue(queue: string) {
        return this.uiQueue.get(queue)
    }

    public getUIByComponentName(componentName: string): BaseUI {
        for (let i = 0; i < this.uiList.length; ++i) {
            if (this.uiList[i].name === componentName) {
                return this.uiList[i];
            }
        }
        return null;
    }

    public closeUI<T extends BaseUI>(uiClass: UIClass<T>, needPopupQueue: boolean) {
        let ui: BaseUI = null
        for (let i = 0; i < this.uiList.length;) {
            // 只要是一个类型都关掉
            if (this.uiList[i].tag === uiClass) {
                // 先hide
                ui = this.uiList[i]

                // 如果queue前面有老界面打开直接关闭
                if (this.checkQueueExistUIBefore(ui) || ui.onShowDestroyAnimation() == false) {
                    ui.destroyUI();
                }

                // 如果真的不需要释放界面实例才需要从缓存的list里面移除，否则保留界面实例
                if (ui.dontDestroyWhenClose == false) {
                    this.uiList.splice(i, 1)
                    continue
                }
            }

            i++
        }

        // 如果是queue把之前的弹出一下
        if (needPopupQueue) {
            this.popQueueUI(ui)
        }
    }

    public closeUIInstance<T extends BaseUI>(uiInstance: T) {
        // 如果view已经被释放关闭了也不重复关闭
        if (uiInstance != undefined && uiInstance != null && uiInstance.getView()) {

            for (let i = 0; i < this.uiList.length; ++i) {
                if (this.uiList[i].tag === uiInstance.tag) {
                    this.uiList.splice(i, 1);
                    break
                }
            }

            if (this.checkQueueExistUIBefore(uiInstance) || uiInstance.onShowDestroyAnimation() == false) {
                uiInstance.destroyUI()
            }

            // 如果是queue把之前的弹出一下
            this.popQueueUI(uiInstance)
        }
    }

    public getExistUI() {
        let uis = []
        for (let index = 0; index < this.uiList.length; index++) {
            const element = this.uiList[index];
            if (element?.getView()?.visible == true) {
                console.log("%c ui : " + element.name + " visible.", "color:yellow")
                uis.push(element)
            }
        }
        return uis
    }

    public closeAllUI(force: boolean = false): void {
        // 先清空所有的队列ui
        this.uiQueue.clear()

        if (this.uiList.length != 0) {
            for (var i: number = 0; i < this.uiList.length;) {
                // * 如果不强制并且不需要关闭的
                if (this.uiList[i].mDontDestroyAtCloseAll == true && force == false) {
                    i++
                    continue
                } else {
                    try {
                        this.uiList[i].destroyUI(force)
                    } catch (e) {
                        console.error(e)
                    }

                    if (this.uiList[i].dontDestroyWhenClose == false || force) {
                        this.uiList.splice(i, 1)
                    } else {
                        i++
                    }
                }
            }
        }
    }

    /**
     * 打开一个界面	- 可同步或者异步
     * @param uiClass UI实例类
     * @param args 界面的onShow时候可以接收的参数,多个参数传数组 [a,b,c]
     * @param isNewInstance 是否每次打开new新的界面实例
     * @param queue 这个界面实例打开是否添加到某个queue里面
     * @param animation 界面显示时候是否存在动画效果
     */
    public async showUI<T extends BaseUI>(
        uiClass: UIClass<T>,
        args: any = null,
        isNewInstance: boolean = false,
        queue: string = null,
        animation: boolean = false,
    ): Promise<BaseUI> {
        // ! 确保先初始化了
        await this.init();

        let ui: BaseUI = null

        if (isNewInstance == false) {
            ui = this.getUI(uiClass);
        }

        // 保护一下args参数
        if (args == null) {
            args = []
        } else if (!(args instanceof Array)) {
            args = [args]
        }

        if (ui) {
            if (ui.getView()) {
                ui.getView().visible = true
            }

            // 打开前确保如果是queue移到最前
            this.moveQueueUIToTop(ui)

            // 执行一次显示
            ui.onShow(...args);
        } else {

            this.showWait(true)

            let tempUI = this._getOrCreateUI(uiClass)
            let fguiPkgs = tempUI.getFguiPackageResNames()
            for (let index = 0; index < fguiPkgs?.length; index++) {
                const element = fguiPkgs[index];
                await S.ResManager.loadFairyGUIPackage(element + "_fui.bytes", element)
            }

            // todo: 是否存在这个界面其他资源需要准备好的情况

            this.showWait(false)

            // 创建这个界面
            ui = this.createUI(uiClass, isNewInstance, queue, animation, args)
        }

        return ui
    }

    private createUI<T extends BaseUI>(
        uiClass: UIClass<T>,
        isNewInstance: boolean,
        queue: string,
        animation: boolean,
        args: any
    ): BaseUI {

        let ui: BaseUI = null
        if (isNewInstance == false) {
            ui = this.getUI(uiClass);
        }

        if (ui != null) {
            return ui;
        }

        ui = new uiClass() as BaseUI;
        ui.tag = uiClass;
        ui.queue = queue
        ui.uiInstanceArgs = args

        // 实例化ui
        ui.createUI(...args);

        // 设置一下打开是否需要动画
        ui.setupAnimation(animation)

        // 把ui插入所有ui列表
        this.uiList.push(ui);

        // 当第一次实例化时候执行1次
        ui.onAwake(...args);

        // 把ui插到queue里面
        this.moveQueueUIToTop(ui)

        // 每次显示都执行一次
        ui.onShow(...args);

        return ui;
    }


    // -----------------------------------------------------------
    //----------------------quick api-----------------------------
    //------------------------------------------------------------

    showWait(isShow: boolean) {
        if (isShow) {
            FairyGUI.GRoot.inst.ShowModalWait()
        } else {
            FairyGUI.GRoot.inst.CloseModalWait()
        }
    }









}