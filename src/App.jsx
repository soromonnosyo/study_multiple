import React, { useState, useMemo, useEffect } from 'react';

// Firestoreの代わりにlocalStorageを使用
const LOCAL_STORAGE_KEY = 'flashcard_groups_v5_data';

// データの初期化: グループIDをキーとしたオブジェクト形式に変更
const INITIAL_GROUPS = {
  1: {
    id: 1,
    name: '基礎知識 (例)',
    cards: [
      { id: 101, category: '日本の歴史', question: '江戸幕府を開いた人物は？', answer: '徳川家康', easyCount: 0 },
      { id: 102, category: 'プログラミング', question: 'Reactにおける状態管理フックの名前は？', answer: 'useState', easyCount: 0 },
    ],
  },
  2: {
    id: 2,
    name: '科学と地理 (例)',
    cards: [
      { id: 201, category: '地理', question: '世界の六大陸のうち、最も面積が広いのは？', answer: 'アジア大陸', easyCount: 0 },
      { id: 202, category: '科学', question: '酸素の元素記号は？', answer: 'O', easyCount: 0 },
    ],
  },
};

// localStorageからグループデータをロードする関数
const loadGroups = () => {
  const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (savedData) {
    try {
      const groups = JSON.parse(savedData);

      // groupsが空オブジェクトの場合、初期データを返す
      if (Object.keys(groups).length === 0) {
        return { groups: INITIAL_GROUPS, nextGroupId: 3, nextCardId: 203 };
      }

      const maxGroupId = Math.max(0, ...Object.keys(groups).map(Number));
      let maxCardId = 0;
      Object.values(groups).forEach(group => {
        group.cards.forEach(card => {
          maxCardId = Math.max(maxCardId, card.id);
        });
      });

      return { groups, nextGroupId: maxGroupId + 1, nextCardId: maxCardId + 1 };
    } catch (e) {
      console.error("Failed to parse groups from localStorage:", e);
      // パース失敗時も初期データを返す
      return { groups: INITIAL_GROUPS, nextGroupId: 3, nextCardId: 203 };
    }
  }
  return { groups: INITIAL_GROUPS, nextGroupId: 3, nextCardId: 203 }; // 初期ID
};

// --- カード表示コンポーネント ---
const CardFace = ({ content, isFront, category, easyCount }) => (
  <div
    style={{ backfaceVisibility: 'hidden' }}
    className={`absolute w-full h-full p-8 flex flex-col justify-center items-center text-center rounded-xl shadow-2xl transition-opacity duration-300 ease-in-out border-b-8 ${isFront ? 'bg-white border-blue-500' : 'bg-white border-green-500'
      }`}
  >
    <div className={`absolute top-0 left-0 m-4 px-3 py-1 text-xs font-semibold rounded-full ${isFront ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
      {isFront ? '問題' : '答え'}
    </div>

    <p className="text-sm text-gray-500 mb-4 font-medium">{category}</p>

    <p className="text-xl md:text-3xl font-bold text-gray-800 leading-snug">
      {content}
    </p>

    {!isFront && (
      <p className="absolute bottom-2 right-2 text-xs text-gray-400">
        わかった回数: {easyCount}
      </p>
    )}
  </div>
);

// --- カード追加フォームコンポーネント ---
function AddCardForm({ categories, onAddCard }) {
  const [formData, setFormData] = useState({
    category: categories.length > 1 ? categories.find(c => c !== '全て') || '' : '',
    question: '',
    answer: '',
    newCategory: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const categoryToUse = formData.newCategory.trim() || formData.category;

    if (!formData.question.trim() || !formData.answer.trim() || !categoryToUse) {
      console.error("必須項目が不足しています。");
      return;
    }

    onAddCard({
      category: categoryToUse,
      question: formData.question.trim(),
      answer: formData.answer.trim(),
    });

    setFormData(prev => ({
      ...prev,
      question: '',
      answer: '',
      newCategory: '',
      category: categoryToUse
    }));
  };

  const existingCategories = categories.filter(c => c !== '全て');

  return (
    <form onSubmit={handleSubmit} className="p-6 mb-6 bg-white border border-indigo-200 rounded-xl shadow-lg">
      <h3 className="text-xl font-bold text-indigo-700 mb-4">カードの追加</h3>

      {/* カテゴリー選択/新規入力 */}
      <div className="mb-4 space-y-3">
        <label className="block text-sm font-medium text-gray-700">カテゴリー</label>
        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          disabled={!!formData.newCategory.trim()}
          className={`block w-full rounded-lg border-gray-300 shadow-sm p-2 text-gray-700 focus:ring-indigo-500 focus:border-indigo-500 ${formData.newCategory.trim() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
        >
          <option value="">--- 既存のカテゴリーを選択 ---</option>
          {existingCategories.length > 0 && existingCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <p className="text-center text-gray-500 text-sm">または、新しいカテゴリーを作成</p>

        <input
          type="text"
          name="newCategory"
          value={formData.newCategory}
          onChange={handleChange}
          placeholder="新しいカテゴリー名を入力 (例: 英語_第1章)"
          className="block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {/* 問題入力 */}
      <div className="mb-4">
        <label htmlFor="question" className="block text-sm font-medium text-gray-700">問題</label>
        <textarea
          id="question"
          name="question"
          value={formData.question}
          onChange={handleChange}
          required
          rows="2"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例: Reactの最新バージョンは？"
        />
      </div>

      {/* 答え入力 */}
      <div className="mb-4">
        <label htmlFor="answer" className="block text-sm font-medium text-gray-700">答え</label>
        <textarea
          id="answer"
          name="answer"
          value={formData.answer}
          onChange={handleChange}
          required
          rows="2"
          className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="例: React 18 / React 19"
        />
      </div>

      {/* 送信ボタン */}
      <button
        type="submit"
        className="w-full px-4 py-2 bg-indigo-600 rounded-lg text-white font-semibold shadow-md hover:bg-indigo-700 transition-colors"
      >
        カードを追加
      </button>
    </form>
  );
}


// --- 学習画面コンポーネント ---
function StudyScreen({ group, setGroup, setScreen, nextCardId, setNextCardId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('全て');
  const [showAddForm, setShowAddForm] = useState(false);

  const cards = group.cards;

  const categories = useMemo(() => {
    const all = cards.map(card => card.category).filter(Boolean);
    return ['全て', ...new Set(all)].sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    if (selectedCategory === '全て') {
      return cards;
    }
    return cards.filter(card => card.category === selectedCategory);
  }, [cards, selectedCategory]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCategory, cards.length]);

  const displayCard = filteredCards[currentIndex];
  const currentFilteredIndex = filteredCards.length > 0 ? currentIndex : -1;

  // --- カード操作 ---
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const moveToNextCard = () => {
    setIsFlipped(false);
    if (filteredCards.length > 0) {
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % filteredCards.length);
      }, 100);
    }
  };

  // --- 学習追跡機能 ---
  const handleLearningAction = (action) => {
    if (!displayCard) return;

    if (action === 'easy') {
      const updatedCards = cards.map(card =>
        card.id === displayCard.id ? { ...card, easyCount: (card.easyCount || 0) + 1 } : card
      );
      setGroup({ ...group, cards: updatedCards });
    }

    moveToNextCard();
  };

  // --- カード追加機能 ---
  const handleAddCard = (newCardData) => {
    const newCard = {
      id: nextCardId,
      ...newCardData,
      easyCount: 0,
    };

    const updatedCards = [...cards, newCard];

    setGroup({ ...group, cards: updatedCards });
    setNextCardId(prevId => prevId + 1);
    setShowAddForm(false);
  };


  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setScreen('Home')}
          className="flex items-center space-x-1 px-3 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span>ホームへ戻る</span>
        </button>
        <h2 className="text-2xl font-extrabold text-gray-800">{group.name}</h2>
      </div>

      {/* --- カード追加ボタン --- */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 rounded-lg text-white font-semibold shadow-md hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span>カードを追加</span>
        </button>
      </div>

      {/* --- カード追加フォーム --- */}
      {showAddForm && <AddCardForm categories={categories} onAddCard={handleAddCard} />}


      {/* --- カテゴリー選択ドロップダウン --- */}
      <div className="flex justify-between items-center mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <label htmlFor="category-select" className="text-gray-600 font-medium mr-4">
          カテゴリー選択:
        </label>
        <select
          id="category-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-700 bg-white"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* --- カードの表示とナビゲーション --- */}
      {filteredCards.length > 0 && displayCard ? (
        <>
          {/* --- 進捗表示 --- */}
          <div className="text-center text-gray-600 mb-4 font-medium">
            <p>
              {currentFilteredIndex + 1} / {filteredCards.length} 枚目 (全 {cards.length} 枚)
            </p>
          </div>

          {/* --- フラッシュカード本体 --- */}
          <div
            className="relative w-full h-80 perspective-1000 cursor-pointer mb-8"
            onClick={handleFlip}
            tabIndex="0"
            onKeyDown={(e) => {
              if (e.key === ' ') {
                e.preventDefault();
                handleFlip();
              }
            }}
          >
            {/* 3D反転コンテナ */}
            <div
              className="relative w-full h-full transition-transform duration-700 ease-in-out transform-gpu"
              style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
              {/* カードの表面 (問題) */}
              <CardFace
                content={displayCard.question}
                isFront={true}
                category={displayCard.category}
                easyCount={displayCard.easyCount}
              />
              {/* カードの裏面 (答え) */}
              <div
                className="absolute w-full h-full transform rotate-y-180"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <CardFace
                  content={displayCard.answer}
                  isFront={false}
                  category={displayCard.category}
                  easyCount={displayCard.easyCount}
                />
              </div>
            </div>
          </div>

          {/* --- 学習追跡ボタン (裏返した後のみ表示) --- */}
          <div className="flex justify-center items-center space-x-4">
            {isFlipped ? (
              <>
                <button
                  onClick={() => handleLearningAction('hard')}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-500 rounded-full text-white font-semibold shadow-lg hover:bg-red-600 transition-all"
                >
                  <span>もう一度 (Hard)</span>
                </button>
                <button
                  onClick={() => handleLearningAction('easy')}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-500 rounded-full text-white font-semibold shadow-lg hover:bg-green-600 transition-all"
                >
                  <span>わかった (Easy)</span>
                </button>
              </>
            ) : (
              <p className="text-gray-500 font-medium">クリックして答えを表示</p>
            )}
          </div>

        </>
      ) : (
        <div className="text-center p-10 bg-white rounded-xl shadow-md">
          <p className="text-lg font-medium text-gray-700">このカテゴリーにはカードがありません。</p>
          <p className="text-sm text-gray-500 mt-2">新しいカードを追加してください。</p>
        </div>
      )}

      {/* --- 操作説明 --- */}
      <p className="text-center text-sm text-gray-500 mt-6">
        カードをクリックするか、スペースキーを押して答えを確認できます。
      </p>
    </div>
  );
}


// --- ホーム画面コンポーネント ---
function HomeScreen({ groups, onCreateGroup, onDeleteGroup, onSelectGroup, nextGroupId, setNextGroupId }) {
  const groupList = Object.values(groups);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (newGroupName.trim() === '') return;

    onCreateGroup(newGroupName.trim(), nextGroupId);
    setNextGroupId(nextGroupId + 1);
    setNewGroupName('');
  };

  const handleDeleteGroup = (groupId) => {
    // 規約に基づき、window.confirm()は使用せず、直接削除を実行します。
    console.warn(`グループID: ${groupId} の削除を実行しました。`);
    onDeleteGroup(groupId);
  };

  return (
    <div className="w-full max-w-xl mx-auto p-4">
      <h1 className="text-4xl font-extrabold text-gray-900 text-center mb-8">
        フラッシュカード グループ一覧
      </h1>

      {/* --- 新規グループ作成フォーム --- */}
      <form onSubmit={handleCreateGroup} className="p-5 mb-8 bg-indigo-50 border border-indigo-200 rounded-xl shadow-md">
        <h3 className="text-xl font-bold text-indigo-700 mb-3">新しいグループを作成</h3>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="グループ名を入力 (例: 英語_中間テスト)"
            className="flex-grow p-2 border border-indigo-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 rounded-lg text-white font-semibold shadow-md hover:bg-indigo-700 transition-colors"
          >
            作成
          </button>
        </div>
      </form>


      {/* --- グループ一覧 --- */}
      <div className="space-y-4">
        {groupList.length === 0 ? (
          <div className="text-center p-8 bg-white rounded-xl shadow-md border border-dashed border-gray-300">
            <p className="text-gray-600 font-medium">まだグループがありません。上記から新しいグループを作成してください。</p>
          </div>
        ) : (
          groupList.map(group => (
            <div
              key={group.id}
              className="p-5 bg-white rounded-xl shadow-lg flex justify-between items-center transition duration-200 hover:shadow-xl hover:ring-2 hover:ring-blue-100"
            >
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-gray-800">{group.name}</h3>
                <p className="text-sm text-gray-500 mt-1">カード数: {group.cards.length} 枚</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => onSelectGroup(group.id)}
                  className="px-4 py-2 bg-blue-500 rounded-lg text-white font-semibold shadow-md hover:bg-blue-600 transition-colors"
                >
                  学習開始
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="p-2 bg-white border border-red-400 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="グループを削除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 6h6v10H7V6z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


// --- メインアプリコンポーネント ---
export default function App() {
  const [{ groups, nextGroupId, nextCardId }, setAppState] = useState(loadGroups);
  const [currentScreen, setCurrentScreen] = useState('Home'); // 'Home' or 'Study'
  const [studyGroupId, setStudyGroupId] = useState(null); // 学習中のグループID

  // ローカルストレージにデータを保存する副作用
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(groups));
  }, [groups]);

  // グループのカードを更新するためのヘルパー関数
  const updateGroupCards = (groupId, newGroupData) => {
    setAppState(prev => ({
      ...prev,
      groups: {
        ...prev.groups,
        [groupId]: newGroupData,
      }
    }));
  };

  // グループ作成ロジック
  const handleCreateGroup = (groupName, id) => {
    const newGroup = {
      id: id,
      name: groupName,
      cards: [],
    };
    setAppState(prev => ({
      ...prev,
      groups: { ...prev.groups, [id]: newGroup }
    }));
  };

  // グループ削除ロジック
  const handleDeleteGroup = (groupId) => {
    setAppState(prev => {
      const newGroups = { ...prev.groups };
      delete newGroups[groupId];
      return { ...prev, groups: newGroups };
    });
  };

  // グループ選択ロジック
  const handleSelectGroup = (groupId) => {
    setStudyGroupId(groupId);
    setCurrentScreen('Study');
  };

  const currentGroup = studyGroupId ? groups[studyGroupId] : null;


  // --- 画面の切り替えとフォールバックロジック (修正点) ---
  let content;

  if (currentScreen === 'Study' && currentGroup) {
    // 正常な学習画面表示
    content = (
      <StudyScreen
        group={currentGroup}
        setGroup={(newGroupData) => updateGroupCards(studyGroupId, newGroupData)}
        setScreen={setCurrentScreen}
        nextCardId={nextCardId}
        setNextCardId={(newId) => setAppState(prev => ({ ...prev, nextCardId: newId }))}
      />
    );
  } else {
    // Home画面表示、またはStudy画面でデータがない場合のフォールバック（画面が消えるのを防ぐ）
    if (currentScreen === 'Study' && !currentGroup) {
      console.warn('学習中のグループデータが見つかりませんでした。ホーム画面に自動で戻ります。');
      // このレンダリングサイクルで状態をHomeに設定。次回のレンダリングでHomeが確定する。
      setCurrentScreen('Home');
    }

    content = (
      <HomeScreen
        groups={groups}
        onCreateGroup={handleCreateGroup}
        onDeleteGroup={handleDeleteGroup}
        onSelectGroup={handleSelectGroup}
        nextGroupId={nextGroupId}
        setNextGroupId={(newId) => setAppState(prev => ({ ...prev, nextGroupId: newId }))}
      />
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-start font-sans p-4 pt-10">
      {content}
      {/* 3D反転のための Tailwind 補助クラスの定義 */}
      <style>{`
        .perspective-1000 {
            perspective: 1000px;
        }
        .rotate-y-180 {
            transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
}
