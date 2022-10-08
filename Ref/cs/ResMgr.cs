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
        public async UniTask<List<T>> LoadAllAssetsInFolderAsync<T>(string folderPath)
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
            
            await handle.Task;

            if (handle.Status != AsyncOperationStatus.Succeeded)
            {
                return null;
            }
            
            // onComplete?.Invoke((List<T>)handle.Result);
            return (List<T>)handle.Result;
        }
        
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
        
        public static async UniTaskVoid LoadFGUIFunction(string name, string extension, Type type, PackageItem ite)
        {
            Debug.Log($"AddPackage.LoadFunc {name}, {extension}, {type.ToString()}, {ite.ToString()}");
            
            if (type == typeof(Texture))
            {
                Texture t = await Addressables.LoadAssetAsync<Texture>(name + extension).ToUniTask();
                ite.owner.SetItemAsset(ite, t, DestroyMethod.Custom);
            }
        }

        public static async UniTask LoadFairyGUIPackage(string address, string packageName)
        {
            var pkgAsset = await Addressables.LoadAssetAsync<TextAsset>(address).ToUniTask();
            if (pkgAsset != null)
            {
                UIPackage.AddPackage(
                    pkgAsset.bytes,
                    packageName,
                    (string name, string extension, Type type, PackageItem ite) =>
                    {
                        LoadFGUIFunction(name,extension,type,ite).Forget();
                    });

                // * 用完就释放
                // Addressables.Release(pkgAsset);     
            }
        }

    }
}