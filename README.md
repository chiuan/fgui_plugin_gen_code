# fgui_plugin_gen_code
fgui的插件-生成ts代码-基于puerts

* 特别的BaseUI.ts是界面管理类，拥有打开界面的流程管理，以及一些基础界面的接口api



# 目录位置
- 插件目录丢到的位置
- 界面基类位置
- 界面生成代码位置

```
UnityProject
    Assets
    Packages
    ProjectSetting
    TsProj
        src
            data
                ui       // * fgui导出代码目录位置，建议相对目录
            framewrok
                ui
                    BaseUI.ts   // * 界面基类、通用类位置
    UIProject
        plugins
            fgui_plugin_gen_code // * 本插件目录位置
    
```

# 关于代码导出
需要在fgui编辑器设置中勾选导出设置
* 同一个包中的代码可以勾选组件界面右侧“生成代码”这个组件即可导出代码
* 如果同一个包导出引用了别的包，那么生成代码那个组件变量是对象类的话，需要在别的包中那个组件勾选导出代码。否则只是个普通GComponent

# 关于多语言标签
* 支持Text、GLoader的组件进行多语言标记，需要在组件右侧勾选“是否多语言”
* 在BaseUI.ts基类中有个接口getLangText读取key对应的value 推荐用我们开源的配置表工具支持多语言列导出:(SuperConfig)[https://github.com/supermobs/SuperConfig]
* 当导出代码目录每个包中会有一个lang.txt保存了一份key-value
