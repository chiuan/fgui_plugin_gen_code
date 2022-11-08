using System;
using System.Collections.Generic;
using Cysharp.Threading.Tasks;
using UnityEngine;

namespace Game
{
    public enum UILayer
    {
        Scene3D, // 例如伤害数字，永远在最底层,比场景的高一点
        Normal,
        Fixed,
        PopUp,
        Loading,
        Guide,
        SceneLoading,
    }

    public abstract class BaseUI
    {
        public string name;
        public Type tag;

        // fgui需要生成的页面的数据
        protected List<string> dependencies;
        protected List<string> configRes;

        protected string packageName;
        protected string componentName;
        
        /// <summary>
        /// 可以在继承类中修改这个界面的层级
        /// </summary>
        protected UILayer layerName = UILayer.Normal;
        
        /// <summary>
        /// 可以在继承类中修改是否全屏界面
        /// </summary>
        protected bool isFullScreen = true;

        // 用于某些界面打开时候是否需要播放动画
        protected bool needShowAnimation = true;

        /**
        * 是否这个界面关闭时候不真的释放界面。只是隐藏起来。
        * 一般用于底部几个需要缓存的主界面
        */
        protected bool dontDestroyWhenClose = false;

        public bool DontDestroyWhenClose
        {
            get { return dontDestroyWhenClose; }
        }

        /**
        * 关闭所有界面接口不关闭这个界面例如加载进度界面
        */
        protected bool mDontDestroyAtCloseAll = false;

        public bool DontDestroyAtCloseAll
        {
            get { return mDontDestroyAtCloseAll; }
        }

        // 是否有队列标记，如果有的话那么关闭时候打开前面的，打开插到队列后面
        public string queue;

        // 创建这个ui时候传递进来的参数
        public object[] uiInstanceArgs;

        // 当前页面的显示对象
        protected FairyGUI.GComponent view;

        // 是否使用多语言
        protected bool useLang = true;

        // 自动绑定FairyGUI元件
        public virtual BaseUI bindAll(FairyGUI.GComponent com)
        {
            return this;
        }

        // 读取配置表获取多语言文本
        protected string getLangText(string key)
        {
            return key;
        }

        public bool isOpen
        {
            get { return this.view?.visible ?? false; }
        }

        protected FairyGUI.GObject getChild(string child)
        {
            return this.view?.GetChild(child);
        }

        public FairyGUI.GComponent getView()
        {
            return this.view;
        }

        /**
        * 设置是否需要播放动画
        */
        public BaseUI setupAnimation(bool show)
        {
            this.needShowAnimation = show;
            return this;
        }

        /**
        * 如果上层实现返回true需要自己播放动画管理super.dispose()
        */
        public bool onShowDestroyAnimation()
        {
            return false;
        }

        /**
        * 获取这个界面需要加载的fgui的资源名称:例如item包括依赖的包
        */
        public List<string> getFguiPackageResNames()
        {
            var ret = new List<string>();

            if (this.packageName != "")
            {
                ret.Add(this.packageName);
            }

            if (this.dependencies?.Count > 0)
            {
                for (int index = 0; index < this.dependencies.Count; index++)
                {
                    var element = this.dependencies[index];
                    ret.Add(element);
                }
            }

            return ret;
        }

        /**
        * 获取这个界面需要的动态配置表文件名,不带后缀
        */
        public List<string> getConfigJsonFileNames()
        {
            return this.configRes;
        }

        public BaseUI createUI(params object[] args)
        {
            // 创建界面
            this.view = FairyGUI.UIPackage.CreateObject(
                this.packageName,
                this.componentName
            ).asCom;

            // 绑定一下界面上的导出组件
            this.bindAll(this.view);

            // 添加到指定的UI层显示
            var layer = UIMgr.Instance.getLayer(this.layerName.ToString());
            layer?.AddChild(this.view);

            // 是否全屏界面
            if (this.isFullScreen)
            {
                this.view?.MakeFullScreen();
            }

            return this;
        }

        protected void addCurrentViewToLayer(UILayer newLayer)
        {
            // let layer = S.UIManager.getLayer(this.layerName.toString())
            // if (this.view) {
            //     // ! 先从添加过的父物体移除
            //     this.view.RemoveFromParent()
            //
            //     layer.AddChild(this.view)
            // }

            if (this.isFullScreen)
            {
                this.view?.MakeFullScreen();
            }
        }

        public void destroyUI(bool force)
        {
            // console.warn("destryUI : " + this.componentName + " - " + this.view?.packageItem.name)

            // 移除这个UI对象身上的事件监听

            // 移除这个对象身上的计时器

            if (this.view?.displayObject != null)
            {
            }

            // 执行一次销毁
            try
            {
                this.onDestroy();
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }

            // 释放显示的对象
            if (this.dontDestroyWhenClose == false || force)
            {
                this.view?.Dispose();
                this.view = null;
            }
            else
            {
                if (this.view?.displayObject != null)
                {
                    this.view.visible = false;
                }
            }
        }

        public async UniTask waitUntilDestroy()
        {
            while (this.isOpen)
            {
                await UniTask.Yield();
            }
        }

        protected virtual void onDestroy()
        {
        }

        public virtual void onAwake(params object[] args)
        {
        }

        public virtual void onShow(params object[] args)
        {
        }

        public virtual void onClose(params object[] args)
        {
        }
    }
}