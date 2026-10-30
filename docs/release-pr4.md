# PR #4の公開・復旧記録

- 対象：[PR #4](https://github.com/mastom-toki/rymansat-orbit-lab/pull/4)
- 公開先：https://mastom-toki.github.io/rymansat-orbit-lab/
- 改修前main・改修前のPages配信commit：`9f00059f309ae1ea05787dea4b89fcef1466d96b`
- 承認・実機検証済みのPR先頭：`ff28b9e9b8ef0b0e6ff78b076a5c077ccae5c0fb`
- 3D実装commit：`76e91546d3fa9e6f3aae4d01979b6b459c2cfd6c`
- 公開準備ではREADMEとこの記録だけを追加・更新し、検証済みのアプリ本体は変更していない。
- 配信設定はmainのルートと`.nojekyll`。マージcommit・Pages結果・公開URLでの確認は、公開後にPR #4へ追記する。公開準備のこの文書だけで反映成功とは扱わない。

## 戻す必要が生じた場合

PR #4はマージcommitを残す方式で取り込む。PRに記載されるマージcommitの親1が上記の改修前mainであることを確認し、そのマージを通常のrevertで取り消す専用ブランチとPRを作る。対象のマージcommitと戻す差分を確認し、所有者の承認後にmainへ取り込み、Pages反映と既存3体験を再確認する。

mainのreset、force push、履歴改変、他の作業の破棄は行わない。公開後に別の改修が入っている場合は、現行mainとの差分とrevertの競合を確認する。改修前commitへの強制置換はしない。
