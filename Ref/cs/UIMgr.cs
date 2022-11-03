using System;
using System.Collections.Generic;
using Cysharp.Threading.Tasks;
using GameCreator.Runtime.Common;
using UnityEngine;

namespace Game
{
    public partial class UIMgr : Singleton<UIMgr>
    {
        private bool isInit;
        private bool isIniting;
        private FairyGUI.GComponent uiRoot;
        private List<BaseUI> uiList = new List<BaseUI>();
        private Dictionary<string, List<BaseUI>> uiQueue = new Dictionary<string, List<BaseUI>>();
        private List<BaseUI> _uiClassInstance = new List<BaseUI>(); // T对应的界面实例类型

        /**
        * 初始化fairyGUI的层级和展示对象到场景
        */
        public async UniTask Init()
        {
            while (isIniting)
            {
                await UniTask.Yield();
            }
            
            if (this.isInit)
            {
                await UniTask.CompletedTask;
                return;
            }

            isIniting = true;
            
            // * 必须先生成界面打开需要的层级
            await ResMgr.LoadFairyGUIPackage("common");

            // * 初始化游戏里面的界面的层级
            await ResMgr.LoadFairyGUIPackage("loading");
            this.uiRoot = FairyGUI.UIPackage.CreateObject("loading", "UIRoot").asCom;
            FairyGUI.GRoot.inst.AddChild(this.uiRoot);

            this.isInit = true;
            this.isIniting = false;
        }

        private BaseUI _getOrCreateUI<T>() where T : BaseUI
        {
            for (int i = 0; i < this._uiClassInstance.Count; ++i)
            {
                if (this._uiClassInstance[i].tag == typeof(T))
                {
                    return this._uiClassInstance[i];
                }
            }

            var tempUI = Activator.CreateInstance<T>();
            this._uiClassInstance.Add(tempUI);

            return tempUI;
        }

        /**
        * 获取某个UI层级对象
        * @param name 层级对象名称
        */
        public FairyGUI.GComponent getLayer(string name)
        {
            return this.uiRoot.GetChild(name)?.asCom;
        }

        public T getUI<T>() where T : BaseUI
        {
            for (int i = 0; i < this.uiList.Count; ++i)
            {
                if (this.uiList[i].tag == typeof(T))
                {
                    return this.uiList[i] as T;
                }
            }

            return null;
        }

        public bool checkInstanceIsActive(BaseUI ui)
        {
            return ui != null && ui.isOpen && ui.getView().onStage;
        }

        public bool checkIsActive<T>() where T : BaseUI
        {
            var com = this.getUI<T>();
            if (com != null && com.isOpen && com.getView().onStage)
            {
                return true;
            }

            return false;
        }

        private void moveQueueUIToTop(BaseUI ui)
        {
            if (ui != null && string.IsNullOrEmpty(ui.queue) == false)
            {
                if (this.uiQueue.ContainsKey(ui.queue))
                {
                    var exists = this.uiQueue[ui.queue];
                    var existIndex = exists.FindIndex((v) => v == ui);
                    if (existIndex != -1)
                    {
                        exists.RemoveAt(existIndex);
                    }

                    exists.Add(ui);

                    // 先把这个位置之前的都关闭掉!
                    for (int index = 0; index < exists.Count - 1; index++)
                    {
                        var oldUI = exists[index];

                        // ! 注意这里不能自动触发打开queue队列里面的ui
                        // ! 这里因为会打开新的，所以老的关闭不播放关闭动画直接关闭
                        oldUI.setupAnimation(false);

                        // this.closeUI(oldUI.tag, false)
                    }
                }
                else
                {
                    this.uiQueue.Add(ui.queue, new List<BaseUI>() {ui});
                }
            }
        }

        private bool checkQueueExistUIBefore(BaseUI ui)
        {
            if (ui != null && string.IsNullOrEmpty(ui.queue) == false)
            {
                if (this.uiQueue.ContainsKey(ui.queue))
                {
                    var exists = this.uiQueue[ui.queue];
                    var existIndex = exists.FindIndex((v) => { return v == ui; });

                    var preIndex = existIndex - 1;
                    if (preIndex >= 0 && preIndex < exists.Count)
                    {
                        return true;
                    }
                }
            }

            return false;
        }

        private void popQueueUI<T>(BaseUI ui) where T : BaseUI
        {
            if (string.IsNullOrEmpty(ui?.queue) == false)
            {
                if (this.uiQueue.ContainsKey(ui.queue))
                {
                    var exists = this.uiQueue[ui.queue];
                    var existIndex = exists.FindIndex((v) => { return v == ui; });
                    if (existIndex != -1)
                    {
                        exists.RemoveAt(existIndex);
                    }

                    var preIndex = existIndex - 1;
                    if (preIndex >= 0 && preIndex < exists.Count)
                    {
                        var preUI = exists[preIndex];

                        // ! 确保打开前这个类型没有在队列里面了避免同一个类型的重复添加
                        exists.RemoveAt(preIndex);

                        // ! 这里因为会打开新的，所以老的关闭不播放关闭动画直接打开
                        var oldShowAnimation = false;
                        this.showUIWith<T>(false, preUI.queue, oldShowAnimation, preUI.uiInstanceArgs).Forget();
                    }
                }
            }
        }

        // 只负责清理当前ui以及这个uiqueue的整条队列记录
        public void clearQueueUI(string queue, bool closeAllQueueUI)
        {
            if (string.IsNullOrEmpty(queue) == false)
            {
                if (closeAllQueueUI && this.uiQueue.ContainsKey(queue))
                {
                    var exists = this.uiQueue[queue];
                    for (int index = 0; index < exists.Count; index++)
                    {
                        var element = exists[index];
                        this.closeUIInstance(element, false);
                    }

                    exists.Clear();
                }
            }
        }

        // 获取uiqueue信息,便于判断当前uiqueue是否已经显示完毕
        public List<BaseUI> getUIqueue(string queue)
        {
            List<BaseUI> list = null;
            this.uiQueue.TryGetValue(queue, out list);
            return list;
        }

        public BaseUI getUIByComponentName(string componentName)
        {
            for (int i = 0; i < this.uiList.Count; ++i)
            {
                if (this.uiList[i].name == componentName)
                {
                    return this.uiList[i];
                }
            }

            return null;
        }

        public void closeUI<T>(bool needPopupQueue) where T : BaseUI
        {
            BaseUI ui = null;
            for (int i = 0; i < this.uiList.Count;)
            {
                // 只要是一个类型都关掉
                if (this.uiList[i].tag == typeof(T))
                {
                    // 先hide
                    ui = this.uiList[i];

                    // 如果queue前面有老界面打开直接关闭
                    if (this.checkQueueExistUIBefore(ui) || ui.onShowDestroyAnimation() == false)
                    {
                        ui.destroyUI(false);
                    }

                    // 如果真的不需要释放界面实例才需要从缓存的list里面移除，否则保留界面实例
                    if (ui.DontDestroyWhenClose == false)
                    {
                        this.uiList.RemoveAt(i);
                        continue;
                    }
                }

                i++;
            }

            // 如果是queue把之前的弹出一下
            if (needPopupQueue)
            {
                this.popQueueUI<T>(ui);
            }
        }

        public void closeUIInstance<T>(T uiInstance, bool needPopupQueue) where T : BaseUI
        {
            // 如果view已经被释放关闭了也不重复关闭
            if (uiInstance != null && uiInstance.getView() != null)
            {
                // * 从已存在的列表中移除这个ui实例
                for (int i = 0; i < this.uiList.Count; ++i)
                {
                    if (this.uiList[i].tag == uiInstance.tag)
                    {
                        this.uiList.RemoveAt(i);
                        break;
                    }
                }

                if (this.checkQueueExistUIBefore(uiInstance) || uiInstance.onShowDestroyAnimation() == false)
                {
                    uiInstance.destroyUI(true);
                }

                // 如果是queue把之前的弹出一下
                if (needPopupQueue)
                {
                    this.popQueueUI<T>(uiInstance);
                }
            }
        }

        public List<BaseUI> getExistUI()
        {
            List<BaseUI> uis = new List<BaseUI>();

            for (int index = 0; index < this.uiList.Count; index++)
            {
                var element = this.uiList[index];
                if (element.isOpen)
                {
                    uis.Add(element);
                }
            }

            return uis;
        }

        public void closeAllUI(bool force = false)
        {
            // 先清空所有的队列ui
            this.uiQueue.Clear();

            if (this.uiList.Count > 0)
            {
                for (int i = 0; i < this.uiList.Count;)
                {
                    // * 如果不强制并且不需要关闭的
                    if (this.uiList[i].DontDestroyAtCloseAll == true && force == false)
                    {
                        i++;
                        continue;
                    }
                    else
                    {
                        try
                        {
                            this.uiList[i].destroyUI(force);
                        }
                        catch (Exception e)
                        {
                            Debug.LogException(e);
                        }

                        if (this.uiList[i].DontDestroyWhenClose == false || force)
                        {
                            this.uiList.RemoveAt(i);
                        }
                        else
                        {
                            i++;
                        }
                    }
                }
            }
        }

        /// <summary>
        /// 打开一个界面
        /// </summary>
        /// <param name="args">可变传参</param>
        /// <typeparam name="T">界面实例</typeparam>
        /// <returns>返回打开的界面实例</returns>
        public async UniTask<T> showUI<T>(params object[] args) where T : BaseUI
        {
            return await showUIWith<T>(false, null, false, args);
        }

        /**
        * 打开一个界面
        * @param uiClass UI实例类
        * @param args 界面的onShow时候可以接收的参数,多个参数传数组 [a,b,c]
        * @param isNewInstance 是否每次打开new新的界面实例
        * @param queue 这个界面实例打开是否添加到某个queue里面
        * @param animation 界面显示时候是否存在动画效果
        */
        public async UniTask<T> showUIWith<T>(bool isNewInstance, string queue, bool animation, params object[] args) where T : BaseUI
        {
            // ! 确保先初始化了
            await this.Init();

            T ui = default;

            if (isNewInstance == false)
            {
                ui = this.getUI<T>();
            }

            if (ui != null)
            {
                if (ui.getView() != null)
                {
                    ui.getView().visible = true;
                }

                // 打开前确保如果是queue移到最前
                this.moveQueueUIToTop(ui);

                // 执行一次显示
                ui.onShow(args);
            }
            else
            {
                this.showWait(true);

                var tempUI = this._getOrCreateUI<T>();
                var fguiPkgs = tempUI.getFguiPackageResNames();
                for (int index = 0; index < fguiPkgs?.Count; index++)
                {
                    var element = fguiPkgs[index];
                    await ResMgr.LoadFairyGUIPackage(element);
                }

                // todo: 是否存在这个界面其他资源需要准备好的情况
                this.showWait(false);

                // 创建这个界面
                ui = this.createUI<T>(isNewInstance, queue, animation, args);
            }

            return ui;
        }

        private T createUI<T>(bool isNewInstance, string queue, bool animation, params object[] args) where T : BaseUI
        {
            T ui = default;
            if (isNewInstance == false)
            {
                ui = this.getUI<T>();
            }

            if (ui != null)
            {
                return ui;
            }

            ui = Activator.CreateInstance<T>();
            ui.tag = typeof(T);
            ui.queue = queue;
            ui.uiInstanceArgs = args;

            // 实例化ui
            ui.createUI(args);

            // 设置一下打开是否需要动画
            ui.setupAnimation(animation);

            // 把ui插入所有ui列表
            this.uiList.Add(ui);

            // 当第一次实例化时候执行1次
            ui.onAwake(args);

            // 把ui插到queue里面
            this.moveQueueUIToTop(ui);

            // 每次显示都执行一次
            ui.onShow(args);

            return ui;
        }

        // -----------------------------------------------------------
        //----------------------quick api-----------------------------
        //------------------------------------------------------------

        public void showWait(bool isShow)
        {
            if (isShow)
            {
                // console.log("show model wait");
                FairyGUI.GRoot.inst.ShowModalWait();
            }
            else
            {
                // console.log("close model wait");
                FairyGUI.GRoot.inst.CloseModalWait();
            }
        }
    }
}