using System;
using System.Collections.Generic;
using Cysharp.Threading.Tasks;
using FairyGUI;
using GameCreator.Runtime.Common;
using QFSW.QC;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

namespace Game
{
    public partial class ResMgr : Singleton<ResMgr>
    {
        protected override void OnCreate()
        {
            base.OnCreate();

            NTexture.CustomDestroyMethod -= NTextureDestroy;
            NTexture.CustomDestroyMethod += NTextureDestroy;
        }

        #region 通用的接口

        /// <summary>
        /// 检查某个key的资源是否存在
        /// </summary>
        public static async UniTask<bool> AddressableResourceExists(object key)
        {
            var exist = await Addressables.LoadResourceLocationsAsync(key);
            return exist?.Count > 0;
        }

        /// <summary>
        /// 根据整个目录加载下面的资源形式加载
        /// </summary>
        public async UniTask<List<T>> LoadAllAssetsInFolderAsync<T>(string folderPath, IProgress<float> progress)
        {
            List<string> assetsToLoad = new List<string>();

            foreach (var locs in Addressables.ResourceLocators)
            {
                foreach (var locsKey in locs.Keys)
                {
                    // Debug.Log(locsKey);
                    string k = locsKey.ToString();
                    if (k.Contains(folderPath))
                    {
                        assetsToLoad.Add(k);
                    }
                }
            }

            AsyncOperationHandle<IList<T>> handle = Addressables.LoadAssetsAsync<T>(assetsToLoad, null, Addressables.MergeMode.Union);
            await handle.ToUniTask(progress);
            if (handle.Status != AsyncOperationStatus.Succeeded)
            {
                return null;
            }

            // onComplete?.Invoke((List<T>)handle.Result);
            return (List<T>) handle.Result;
        }

        #endregion

        #region FairyGUI加载相关

        static void NTextureDestroy(Texture t)
        {
            try
            {
                Addressables.Release(t);
            }
            catch (Exception e)
            {
                Debug.LogError($"fairygui CustomDestroyMethod release Error: " + e.Message);
            }
        }

        public static void ReleaseFGUIPackage(string packageName)
        {
            UIPackage.RemovePackage(packageName);
        }

        // * 内部委托的ui异步加载方法
        static async UniTaskVoid LoadFGUIFunction(string name, string extension, Type type, PackageItem ite)
        {
#if UNITY_EDITOR
            // Debug.Log($"AddPackage.LoadFunc {name}, {extension}, {type.ToString()}, {ite.ToString()}");
#endif

            if (type == typeof(Texture))
            {
                Texture t = await Addressables.LoadAssetAsync<Texture>("UI/" + name + extension).ToUniTask();
                ite.owner.SetItemAsset(ite, t, DestroyMethod.Custom);
            }
            else if (type == typeof(AudioClip))
            {
                AudioClip c = await Addressables.LoadAssetAsync<AudioClip>("UI/" + name + extension).ToUniTask();
                ite.owner.SetItemAsset(ite, type, DestroyMethod.Custom);
            }
            else
            {
                Debug.LogWarning($"LoadFUI Asset unknown {name}.{extension} {type}");
            }
        }

        public static async UniTask LoadFairyGUIPackage(string packageName)
        {
            string address = "UI/" + packageName + "_fui.bytes";
            var pkgAsset = await Addressables.LoadAssetAsync<TextAsset>(address).ToUniTask();
            if (pkgAsset != null)
            {
                UIPackage.AddPackage(
                    pkgAsset.bytes,
                    packageName,
                    (string name, string extension, Type type, PackageItem ite) => { LoadFGUIFunction(name, extension, type, ite).Forget(); });

                // * 用完就释放
                // Addressables.Release(pkgAsset);     
#if UNITY_EDITOR
                // Debug.Log($"load fui package {packageName} done.");
#endif
            }
        }

        #endregion

        #region 配置表加载

        private Dictionary<string, byte[]> _loadConfigDictionary = new Dictionary<string, byte[]>();

        public static async UniTask<bool> PreloadConfigs(List<string> addressList, IProgress<float> progress)
        {
            for (int i = 0; i < addressList.Count; i++)
            {
                // + ".bytes"
                addressList[i] = "Config/" + addressList[i];
            }

            var handle = Addressables.LoadAssetsAsync<TextAsset>(addressList, null, Addressables.MergeMode.Union);
            var rets = await handle.ToUniTask(progress);
            if (handle.Status != AsyncOperationStatus.Succeeded)
            {
                return false;
            }

            if (rets?.Count == addressList.Count)
            {
                for (int i = 0; i < rets.Count; i++)
                {
                    Instance._loadConfigDictionary[rets[i].name] = rets[i].bytes;
                }

                return true;
            }

            return false;
        }

        public static byte[] GetConfigFileBytes(string address)
        {
            if (Instance._loadConfigDictionary.TryGetValue(address, out byte[] bytes))
            {
                return bytes;
            }

            return null;
        }

        #endregion
    }
}