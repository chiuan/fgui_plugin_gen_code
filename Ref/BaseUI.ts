import { FairyGUI } from 'csharp';
import { S } from 'global/GameConfig';

/**
 * 可以把UI生成到层级越往后越高层级
 */
export enum UILayer {
    Scene3D = "Scene3D", // 例如伤害数字，永远在最底层
    Normal = "Normal",
    Fixed = "Fixed",
    PopUp = "PopUp",
    Loading = "Loading",
    Guide = "Guide",
    SceneLoading = "SceneLoading",
}

// 页面实例的通用接口对象
export interface UIClass<T extends BaseUI> {
    new(): T;
}


export abstract class BaseUI {
    public name: string;
    public tag: any;

    // fgui需要生成的页面的数据
    protected dependencies = []; // 依赖的包名 fgui packagenames
    protected configRes = []; // 依赖的配置表名字 例如这个动态界面用到配置表: item
    // protected otherPreloadUrls: LoadGruopInfo // 可以设置其他资源url需要确保先下载完再打开的

    protected packageName = "";
    protected componentName = "";
    protected layerName = UILayer.Normal
    protected isFullScreen: boolean = true

    // 用于某些界面打开时候是否需要播放动画
    protected needShowAnimation: boolean = true

    // 异步界面加载的资源组
    isAsyncUI: boolean = false
    // asyncLoadGruopInfo: LoadGruopInfo

    /**
     * 是否这个界面关闭时候不真的释放界面。只是隐藏起来。
     * 一般用于底部几个需要缓存的主界面
     */
    dontDestroyWhenClose: boolean = false

    /**
    * 关闭所有界面接口不关闭这个界面例如加载进度界面
    */
    mDontDestroyAtCloseAll: boolean = false

    // 是否有队列标记，如果有的话那么关闭时候打开前面的，打开插到队列后面
    public queue: string;

    private _args: any
    public get uiInstanceArgs(): any {
        return this._args
    }
    public set uiInstanceArgs(v: any) {
        this._args = v
    }

    // 当前页面的显示对象
    protected view: FairyGUI.GComponent;

    // 是否使用多语言
    protected useLang: boolean = true;

    // 自动绑定FairyGUI元件
    public bindAll(com: FairyGUI.GComponent): any {
        return this
    }

    // 读取配置表获取多语言文本
    protected getLangText(key: string): string {
        return key
    }

    public get isOpen(): boolean {
        return this.view?.visible ?? false;
    }

    protected getChild(child: string): FairyGUI.GObject {
        return this.view?.GetChild(child)
    }

    public getView(): FairyGUI.GComponent {
        return this.view
    }

    /**
     * 设置是否需要播放动画
     */
    public setupAnimation(show: boolean): BaseUI {
        this.needShowAnimation = show
        return this
    }

    /**
     * 如果上层实现返回true需要自己播放动画管理super.dispose()
     */
    public onShowDestroyAnimation(): boolean {
        return false
    }

    /**
     * 获取这个界面需要加载的fgui的资源名称:例如item包括依赖的包
     */
    public getFguiPackageResNames(): string[] {
        let ret = new Array<string>()

        if (this.packageName != "") {
            ret.push(this.packageName)
        }

        if (this.dependencies?.length > 0) {
            for (let index = 0; index < this.dependencies.length; index++) {
                const element = this.dependencies[index];
                ret.push(element)
            }
        }

        return ret
    }

    /**
     * 获取这个界面需要的动态配置表文件名,不带后缀
     */
    public getConfigJsonFileNames(): string[] {
        return this.configRes
    }


    public createUI(...args: any[]) {
        // 创建界面
        this.view = FairyGUI.UIPackage.CreateObject(
            this.packageName,
            this.componentName
        ).asCom;

        // 绑定一下界面上的导出组件
        this.bindAll(this.view)

        // ! 添加到指定的UI层显示
        let layer = S.UIManager.getLayer(this.layerName.toString())
        if (this.view) {
            layer.AddChild(this.view)
        }

        if (this.isFullScreen) {
            this.view?.MakeFullScreen()
        }

    }

    protected addCurrentViewToLayer(newLayer: UILayer) {
        let layer = S.UIManager.getLayer(this.layerName.toString())
        if (this.view) {
            // ! 先从添加过的父物体移除
            this.view.RemoveFromParent()

            layer.AddChild(this.view)
        }

        if (this.isFullScreen) {
            this.view?.MakeFullScreen()
        }
    }

    public destroyUI(force: boolean = false) {
        // console.warn("destryUI : " + this.componentName + " - " + this.view?.packageItem.name)

        // 移除这个UI对象身上的事件监听

        // 移除这个对象身上的计时器

        if (this.view) {
        }

        // 执行一次销毁
        try {
            // this.onDestroy();
        }
        catch (e) {
            console.error(e)
        }

        // 释放显示的对象
        if (this.dontDestroyWhenClose == false || force) {
            this.view?.Dispose();
            this.view = null
        } else {
            if (this.view) {
                this.view.visible = false
            }
        }
    }

    public abstract onAwake(...args: any): void;
    public abstract onShow(...args: any): void;
    public abstract onClose(...args: any): void;

}