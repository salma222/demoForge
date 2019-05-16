using Autodesk.Forge;
using Autodesk.Forge.Model;
using System;
using System.Diagnostics;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace forgesample.Controllers
{
    public class OSSController : ApiController
    {
        /// <summary>
        /// Return list of buckets (id=#) or list of objects (id=bucketKey)
        /// </summary>
        [HttpGet]
        [Route("api/forge/oss/buckets")]
        public async Task<IList<TreeNode>> GetOSSAsync([FromUri]string id)
        {
            IList<TreeNode> nodes = new List<TreeNode>();
            dynamic oauth = await OAuthController.GetInternalAsync();

            if (id == "#") // root
            {
                // in this case, let's return all buckets
                BucketsApi appBckets = new BucketsApi();
                appBckets.Configuration.AccessToken = oauth.access_token;

                // to simplify, let's return only the first 100 buckets
                dynamic buckets = await appBckets.GetBucketsAsync("US", 100);
                foreach (KeyValuePair<string, dynamic> bucket in new DynamicDictionaryItems(buckets.items))
                {
                    
                    nodes.Add(new TreeNode(bucket.Value.bucketKey, bucket.Value.bucketKey, "bucket", true));
                }
            }
            else
            {
                // as we have the id (bucketKey), let's return all 
                ObjectsApi objects = new ObjectsApi();
                objects.Configuration.AccessToken = oauth.access_token;
                var objectsList = objects.GetObjects(id);
                foreach (KeyValuePair<string, dynamic> objInfo in new DynamicDictionaryItems(objectsList.items))
                {
                    nodes.Add(new TreeNode(Base64Encode((string)objInfo.Value.objectId),
                      objInfo.Value.objectKey, "object", false));
                }
            }

           return nodes;
        }

        /// <summary>
        /// Model data for jsTree used on GetOSSAsync
        /// </summary>
        public class TreeNode
        {
            public TreeNode(string id, string text, string type, bool children)
            {
                this.id = id;
                this.text = text;
                this.type = type;
                this.children = children;
            }

            public string id { get; set; }
            public string text { get; set; }
            public string type { get; set; }
            public bool children { get; set; }
        }

        /// <summary>
        /// Create a new bucket 
        /// </summary>
        [HttpPost]
        [Route("api/forge/oss/buckets")]
        public async Task<dynamic> CreateBucket([FromBody]CreateBucketModel bucket)
        {
            BucketsApi buckets = new BucketsApi();
            dynamic token = await OAuthController.GetInternalAsync();
            buckets.Configuration.AccessToken = token.access_token;
            PostBucketsPayload bucketPayload = new PostBucketsPayload(bucket.bucketKey, null,
              PostBucketsPayload.PolicyKeyEnum.Transient);
            return await buckets.CreateBucketAsync(bucketPayload, "US");
        }

        /// <summary>
        /// Input model for CreateBucket method
        /// </summary>
        public class CreateBucketModel
        {
            public string bucketKey { get; set; }
        }
        public class DeleteBucketModel
        {
            public string bucketKey { get; set; }
        }
        
        [HttpPost]
        [Route("api/forge/oss/buckets/delete")]
        public async Task<dynamic> DeleteBucket([FromBody]DeleteBucketModel objInfo)
        {

            // get the bucket...

            BucketsApi Buck = new BucketsApi();
            dynamic token = await OAuthController.GetInternalAsync();

            Buck.Configuration.AccessToken = token.access_token;


            await Buck.DeleteBucketAsync(objInfo.bucketKey);

            return Task.CompletedTask;
        }

        /// <summary>
        /// Receive a file from the client and upload to the bucket
        /// </summary>
        /// <returns></returns>
        [HttpPost]
        [Route("api/forge/oss/objects")]
        public async Task<dynamic> UploadObject()
        {
            // basic input validation
            HttpRequest req = HttpContext.Current.Request;
            if (string.IsNullOrWhiteSpace(req.Params["bucketKey"]))
                throw new System.Exception("BucketKey parameter was not provided.");

            if (req.Files.Count != 1)
                throw new System.Exception("Missing file to upload"); // for now, let's support just 1 file at a time

            string bucketKey = req.Params["bucketKey"];
            HttpPostedFile file = req.Files[0];

            // save the file on the server
            var fileSavePath = Path.Combine(HttpContext.Current.Server.MapPath("~/App_Data"), file.FileName);
            file.SaveAs(fileSavePath);

            // get the bucket...
            dynamic oauth = await OAuthController.GetInternalAsync();
            ObjectsApi objects = new ObjectsApi();
            objects.Configuration.AccessToken = oauth.access_token;

            // upload the file/object, which will create a new object
            dynamic uploadedObj;
            using (StreamReader streamReader = new StreamReader(fileSavePath))
            {
                uploadedObj = await objects.UploadObjectAsync(bucketKey,
                       file.FileName, (int)streamReader.BaseStream.Length, streamReader.BaseStream,
                       "application/octet-stream");
            }

            // cleanup
            File.Delete(fileSavePath);

            return uploadedObj;
        }

        [HttpPost]
        [Route("api/forge/oss/objects/delete")]
        public async Task<dynamic> DeleteObject([FromBody]DeleteObjectModel objInfo)
        {

            // get the bucket...

            ObjectsApi objs = new ObjectsApi();
            dynamic token = await OAuthController.GetInternalAsync();

            objs.Configuration.AccessToken = token.access_token;


            await objs.DeleteObjectAsync(objInfo.bucketKey, objInfo.objectKey);
            

            return Task.CompletedTask;
        }

        public class DeleteObjectModel
        {
            public string bucketKey { get; set; }
            public string objectKey { get; set; }
        }

        /// <summary>
        /// Base64 enconde a string
        /// </summary>
        public static string Base64Encode(string plainText)
        {
            var plainTextBytes = System.Text.Encoding.UTF8.GetBytes(plainText);
            return System.Convert.ToBase64String(plainTextBytes);
        }
    }
}